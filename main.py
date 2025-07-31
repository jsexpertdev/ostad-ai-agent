import os
import json
import asyncio
from datetime import datetime
from typing import List, Optional
from dataclasses import dataclass
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from openai import AsyncOpenAI
from agents import (
    Agent, OpenAIChatCompletionsModel, Runner, function_tool,
    set_tracing_disabled, InputGuardrail, GuardrailFunctionOutput,
    InputGuardrailTripwireTriggered, RunContextWrapper
)

# Load environment variables
load_dotenv()
BASE_URL = os.getenv("BASE_URL")
API_KEY = os.getenv("API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME")

if not BASE_URL or not API_KEY or not MODEL_NAME:
    raise ValueError("Please set BASE_URL, API_KEY, and MODEL_NAME in your .env file")

client = AsyncOpenAI(base_url=BASE_URL, api_key=API_KEY)
set_tracing_disabled(disabled=True)

# === MODELS ===

class FlightRecommendation(BaseModel):
    airline: str
    departure_time: str
    arrival_time: str
    price: float
    direct_flight: bool
    recommendation_reason: str

class HotelRecommendation(BaseModel):
    name: str
    location: str
    price_per_night: float
    amenities: List[str]
    recommendation_reason: str

class TravelPlan(BaseModel):
    destination: str
    duration_days: int
    budget: float
    activities: List[str]
    notes: str

class BudgetAnalysis(BaseModel):
    is_realistic: bool
    reasoning: str
    suggested_budget: Optional[float] = None

@dataclass
class UserContext:
    user_id: str
    preferred_airlines: List[str] = None
    hotel_amenities: List[str] = None
    budget_level: str = None
    session_start: datetime = None

    def __post_init__(self):
        if self.preferred_airlines is None:
            self.preferred_airlines = []
        if self.hotel_amenities is None:
            self.hotel_amenities = []
        if self.session_start is None:
            self.session_start = datetime.now()

# === TOOLS ===

@function_tool
def get_weather_forecast(city: str, date: str) -> str:
    """Get the weather forecast for a city on a specific date."""
    weather_data = {
        "New York": "sunny 22°C", "Tokyo": "cloudy 18°C",
        "Paris": "rainy 14°C", "Miami": "sunny 30°C"
    }
    return weather_data.get(city, f"No forecast available for {city}.")

@function_tool
async def search_flights(wrapper: RunContextWrapper[UserContext], origin: str, destination: str, date: str) -> str:
    flights = [
        {"airline": "SkyWays", "departure_time": "08:00", "arrival_time": "10:30", "price": 350.00, "direct": True},
        {"airline": "OceanAir", "departure_time": "12:45", "arrival_time": "15:15", "price": 275.50, "direct": True},
        {"airline": "BudgetFly", "departure_time": "16:30", "arrival_time": "20:00", "price": 199.99, "direct": False}
    ]
    return json.dumps(flights)

@function_tool
async def search_hotels(wrapper: RunContextWrapper[UserContext], city: str, check_in: str, check_out: str, max_price: Optional[float] = None) -> str:
    hotels = [
        {"name": "City Center Hotel", "location": "Downtown", "price_per_night": 199.99, "amenities": ["WiFi", "Pool"]},
        {"name": "Budget Inn", "location": "Uptown", "price_per_night": 99.99, "amenities": ["WiFi"]},
        {"name": "Luxury Palace", "location": "Historic", "price_per_night": 399.99, "amenities": ["Spa", "WiFi", "Pool"]}
    ]
    return json.dumps(hotels)

# === GUARDRAIL ===

budget_analysis_agent = Agent(
    name="Budget Analyzer",
    instructions="You analyze if the user's travel budget is realistic and suggest improvements.",
    output_type=BudgetAnalysis,
    model=OpenAIChatCompletionsModel(model=MODEL_NAME, openai_client=client),
)

async def budget_guardrail(ctx, agent, input_data):
    try:
        prompt = f"Analyze this travel plan: {input_data}"
        result = await Runner.run(budget_analysis_agent, prompt, context=ctx.context)
        output = result.final_output_as(BudgetAnalysis)
        return GuardrailFunctionOutput(output_info=output, tripwire_triggered=not output.is_realistic)
    except Exception as e:
        return GuardrailFunctionOutput(
            output_info=BudgetAnalysis(is_realistic=True, reasoning=f"Error: {str(e)}"),
            tripwire_triggered=False
        )

# === AGENTS ===

flight_agent = Agent[UserContext](
    name="Flight Agent",
    instructions="Recommend flights based on preferences.",
    model=OpenAIChatCompletionsModel(model=MODEL_NAME, openai_client=client),
    tools=[search_flights],
    output_type=FlightRecommendation
)

hotel_agent = Agent[UserContext](
    name="Hotel Agent",
    instructions="Recommend hotels based on user preferences.",
    model=OpenAIChatCompletionsModel(model=MODEL_NAME, openai_client=client),
    tools=[search_hotels],
    output_type=HotelRecommendation
)

conversational_agent = Agent[UserContext](
    name="General Chat",
    instructions="Engage in friendly travel conversation.",
    model=OpenAIChatCompletionsModel(model=MODEL_NAME, openai_client=client),
)

travel_agent = Agent[UserContext](
    name="Travel Planner",
    instructions="Plan trips with weather, hotels, flights, and budget checks.",
    model=OpenAIChatCompletionsModel(model=MODEL_NAME, openai_client=client),
    tools=[get_weather_forecast],
    handoffs=[flight_agent, hotel_agent, conversational_agent],
    input_guardrails=[InputGuardrail(guardrail_function=budget_guardrail)],
    output_type=TravelPlan
)

# === FASTAPI APP ===

app = FastAPI(title="Travel Planner API")

class TravelQueryRequest(BaseModel):
    query: str
    user_id: str
    preferred_airlines: Optional[List[str]] = []
    hotel_amenities: Optional[List[str]] = []
    budget_level: Optional[str] = None

@app.post("/plan")
async def get_travel_plan(request: TravelQueryRequest):
    user_context = UserContext(
        user_id=request.user_id,
        preferred_airlines=request.preferred_airlines,
        hotel_amenities=request.hotel_amenities,
        budget_level=request.budget_level,
        session_start=datetime.now()
    )

    try:
        result = await Runner.run(travel_agent, request.query, context=user_context)
        return {
            "type": type(result.final_output).__name__,
            "data": result.final_output.model_dump()
        }
    except InputGuardrailTripwireTriggered as e:
        raise HTTPException(status_code=400, detail="Budget too low or invalid")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# === Run with: uvicorn main:app --reload ===
