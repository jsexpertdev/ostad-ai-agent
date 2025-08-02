import React, { useState, useEffect } from 'react';
import { Send, User, Bot, Briefcase, BookOpen, Target, Plus, X } from 'lucide-react';
import './App.css';

const CareerMate = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [userSkills, setUserSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Welcome message
    setMessages([{
      id: 1,
      type: 'bot',
      agent: 'conversation',
      content: "👋 Welcome to CareerMate! I'm your AI career advisor. I can help you with:\n\n• 🎯 Skill gap analysis for your dream job\n• 💼 Finding job opportunities\n• 📚 Course recommendations\n\nWhat would you like to explore today?",
      timestamp: new Date()
    }]);
  }, []);

  const addSkill = () => {
    if (newSkill.trim() && !userSkills.includes(newSkill.trim())) {
      setUserSkills([...userSkills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setUserSkills(userSkills.filter(skill => skill !== skillToRemove));
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          userSkills: userSkills
        }),
      });

      const data = await response.json();

      if (data.success) {
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          agent: data.data.agent,
          content: data.data.response,
          data: data.data,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        agent: 'error',
        content: 'Sorry, I encountered an error. Please make sure the server is running and try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAgentIcon = (agent) => {
    switch (agent) {
      case 'skill_gap': return <Target className="w-5 h-5" />;
      case 'job_finder': return <Briefcase className="w-5 h-5" />;
      case 'course_recommender': return <BookOpen className="w-5 h-5" />;
      default: return <Bot className="w-5 h-5" />;
    }
  };

  const getAgentColor = (agent) => {
    switch (agent) {
      case 'skill_gap': return 'bg-blue-500';
      case 'job_finder': return 'bg-green-500';
      case 'course_recommender': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const renderMessageContent = (message) => {
    if (message.agent === 'skill_gap' && message.data?.missingSkills) {
      return (
        <div className="space-y-3">
          <p className="text-gray-700">{message.content}</p>
          
          {message.data.matchingSkills?.length > 0 && (
            <div className="bg-green-50 p-3 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">✅ Skills You Have:</h4>
              <div className="flex flex-wrap gap-2">
                {message.data.matchingSkills.map((skill, idx) => (
                  <span key={idx} className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {message.data.missingSkills?.length > 0 && (
            <div className="bg-red-50 p-3 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-2">❌ Skills to Learn:</h4>
              <div className="flex flex-wrap gap-2">
                {message.data.missingSkills.map((skill, idx) => (
                  <span key={idx} className="bg-red-200 text-red-800 px-2 py-1 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (message.agent === 'job_finder' && message.data?.jobs) {
      return (
        <div className="space-y-3">
          <p className="text-gray-700">{message.content}</p>
          {message.data.jobs.map((job, idx) => (
            <div key={idx} className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <h4 className="font-semibold text-blue-900">{job.title}</h4>
              <p className="text-blue-700">{job.company} • {job.location}</p>
              <p className="text-green-600 font-semibold">{job.salary}</p>
              <div className="mt-2">
                <span className="text-sm text-gray-600">Required skills: </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {job.skills.map((skill, skillIdx) => (
                    <span key={skillIdx} className="bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-xs">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Skills match: {job.matchCount}/{job.skills.length}
              </p>
            </div>
          ))}
        </div>
      );
    }

    if (message.agent === 'course_recommender' && message.data?.recommendations) {
      return (
        <div className="space-y-3">
          <p className="text-gray-700">{message.content}</p>
          {Object.entries(message.data.recommendations).map(([skill, courses]) => (
            <div key={skill} className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-3">📚 Courses for {skill}:</h4>
              {courses.map((course, idx) => (
                <div key={idx} className="bg-white p-3 rounded border mb-2">
                  <h5 className="font-medium text-gray-900">{course.title}</h5>
                  <p className="text-purple-600 text-sm">{course.platform}</p>
                  <a href={course.link} target="_blank" rel="noopener noreferrer" 
                     className="text-blue-500 hover:text-blue-700 text-sm underline">
                    View Course →
                  </a>
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    return <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-t-xl shadow-lg p-6 border-b">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              🎯 CareerMate
            </h1>
            <p className="text-gray-600">Your AI-powered career advisor</p>
          </div>

          {/* Skills Panel */}
          <div className="bg-white shadow-lg p-4 border-b">
            <h3 className="font-semibold text-gray-700 mb-3">Your Skills Profile:</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {userSkills.map((skill, idx) => (
                <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  {skill}
                  <button
                    onClick={() => removeSkill(skill)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                placeholder="Add a skill (e.g., Python, JavaScript)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addSkill}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Chat Container */}
          <div className="bg-white shadow-lg h-96 overflow-y-auto chat-container">
            <div className="p-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl flex gap-3 message-bubble ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === 'user' ? 'bg-blue-500' : getAgentColor(message.agent)
                    } text-white flex-shrink-0`}>
                      {message.type === 'user' ? <User className="w-4 h-4" /> : getAgentIcon(message.agent)}
                    </div>
                    <div className={`rounded-lg p-4 ${
                      message.type === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {message.type === 'bot' && message.agent !== 'conversation' && (
                        <div className="text-xs text-gray-500 mb-2">
                          Agent: {message.agent.replace('_', ' ')}
                        </div>
                      )}
                      {renderMessageContent(message)}
                      <div className="text-xs opacity-70 mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center text-white">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-gray-100 rounded-lg p-4">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className="bg-white rounded-b-xl shadow-lg p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about careers, skills, jobs, or courses..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setInputMessage("I want to become a data scientist")}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300"
              >
                Skill gap for data scientist
              </button>
              <button
                onClick={() => setInputMessage("Find me frontend developer jobs")}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300"
              >
                Find jobs
              </button>
              <button
                onClick={() => setInputMessage("How can I learn React and JavaScript?")}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300"
              >
                Course recommendations
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerMate;