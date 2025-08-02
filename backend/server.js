// server.js - FIXED VERSION
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// GitHub API configuration - UPDATED ENDPOINTS
const GITHUB_API_URL = 'https://models.inference.ai.azure.com';
const GITHUB_API_KEY = process.env.GITHUB_API_KEY;

// Dummy Data (same as before)
const SKILLS_DATABASE = {
  'data scientist': ['Python', 'Machine Learning', 'Statistics', 'SQL', 'Pandas', 'NumPy', 'Scikit-learn', 'Data Visualization'],
  'web developer': ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'Git', 'Responsive Design'],
  'data analyst': ['SQL', 'Excel', 'Python', 'Tableau', 'Statistics', 'Data Visualization'],
  'software engineer': ['Programming', 'Data Structures', 'Algorithms', 'Git', 'Testing', 'Problem Solving'],
  'product manager': ['Project Management', 'Market Research', 'Data Analysis', 'Communication', 'Agile', 'Strategic Planning'],
  'ui/ux designer': ['Design Principles', 'Figma', 'Adobe Creative Suite', 'Prototyping', 'User Research', 'Wireframing']
};

const JOBS_DATABASE = [
  {
    title: 'Junior Data Scientist',
    company: 'TechCorp Inc.',
    location: 'New York, NY',
    skills: ['Python', 'Machine Learning', 'Statistics', 'SQL'],
    salary: '$75,000 - $90,000'
  },
  {
    title: 'Frontend Developer',
    company: 'WebSolutions Ltd.',
    location: 'San Francisco, CA',
    skills: ['JavaScript', 'React', 'CSS', 'HTML'],
    salary: '$80,000 - $100,000'
  },
  {
    title: 'Data Analyst',
    company: 'Analytics Pro',
    location: 'Chicago, IL',
    skills: ['SQL', 'Python', 'Tableau', 'Excel'],
    salary: '$60,000 - $75,000'
  },
  {
    title: 'Full Stack Developer',
    company: 'StartupXYZ',
    location: 'Austin, TX',
    skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
    salary: '$85,000 - $110,000'
  },
  {
    title: 'UX Designer',
    company: 'Design Studio',
    location: 'Los Angeles, CA',
    skills: ['Figma', 'User Research', 'Prototyping', 'Design Principles'],
    salary: '$70,000 - $90,000'
  }
];

const COURSES_DATABASE = {
  'Python': [
    { title: 'Python for Data Science', platform: 'Coursera', link: 'https://coursera.org/python-data-science' },
    { title: 'Complete Python Bootcamp', platform: 'Udemy', link: 'https://udemy.com/python-bootcamp' }
  ],
  'Machine Learning': [
    { title: 'Machine Learning Course', platform: 'Coursera', link: 'https://coursera.org/machine-learning' },
    { title: 'Hands-On Machine Learning', platform: 'Udemy', link: 'https://udemy.com/machine-learning' }
  ],
  'SQL': [
    { title: 'SQL for Data Science', platform: 'Coursera', link: 'https://coursera.org/sql-data-science' },
    { title: 'The Complete SQL Bootcamp', platform: 'Udemy', link: 'https://udemy.com/sql-bootcamp' }
  ],
  'React': [
    { title: 'React - The Complete Guide', platform: 'Udemy', link: 'https://udemy.com/react-complete' },
    { title: 'React Specialization', platform: 'Coursera', link: 'https://coursera.org/react-specialization' }
  ],
  'JavaScript': [
    { title: 'JavaScript: The Complete Guide', platform: 'Udemy', link: 'https://udemy.com/javascript-complete' },
    { title: 'JavaScript Algorithms and Data Structures', platform: 'freeCodeCamp', link: 'https://freecodecamp.org/javascript' }
  ],
  'Statistics': [
    { title: 'Statistics for Data Science', platform: 'Coursera', link: 'https://coursera.org/statistics' },
    { title: 'Business Statistics', platform: 'edX', link: 'https://edx.org/statistics' }
  ],
  'Figma': [
    { title: 'Figma UI/UX Design Essentials', platform: 'Udemy', link: 'https://udemy.com/figma-essentials' },
    { title: 'Design Systems with Figma', platform: 'Skillshare', link: 'https://skillshare.com/figma' }
  ]
};

// IMPROVED Agent Classes with Fallback Intent Detection
class ConversationAgent {
  async processQuery(query, userSkills = []) {
    let intent;
    
    // Try AI-powered intent detection first
    try {
      intent = await this.detectIntentWithAI(query);
      console.log('✅ AI Intent Detection Success:', intent);
    } catch (error) {
      console.log('❌ AI Intent Detection Failed:', error.message);
      // Fallback to rule-based intent detection
      intent = this.detectIntentFallback(query);
      console.log('🔄 Fallback Intent Detection:', intent);
    }
    
    switch (intent.type) {
      case 'skill_gap':
        const skillGapAgent = new SkillGapAgent();
        return await skillGapAgent.analyzeSkillGap(userSkills, intent.targetJob);
      
      case 'job_search':
        const jobFinderAgent = new JobFinderAgent();
        return await jobFinderAgent.findJobs(userSkills, intent.location);
      
      case 'course_recommendation':
        const courseAgent = new CourseRecommenderAgent();
        return await courseAgent.recommendCourses(intent.skills);
      
      default:
        return {
          agent: 'conversation',
          response: 'I can help you with career planning! I can analyze skill gaps, find job opportunities, or recommend courses. What would you like to explore?'
        };
    }
  }

  // AI-powered intent detection using GitHub API
  async detectIntentWithAI(query) {
    if (!GITHUB_API_KEY) {
      throw new Error('GitHub API key not configured');
    }

    const response = await axios.post(
      `${GITHUB_API_URL}/chat/completions`,
      {
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: `Analyze this career query and return ONLY valid JSON:
          Query: "${query}"
          
          Classify as: skill_gap, job_search, course_recommendation, or general
          Extract: targetJob, location, skills if mentioned
          
          Response format: {"type": "classification", "targetJob": "job_title_or_null", "location": "location_or_null", "skills": ["skill1", "skill2"]}`
        }],
        temperature: 0.1,
        max_tokens: 200
      },
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    const content = response.data.choices[0].message.content.trim();
    console.log('🤖 AI Response:', content);
    
    // Clean up the response to extract JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }
    
    return JSON.parse(jsonMatch[0]);
  }

  // Fallback rule-based intent detection
  detectIntentFallback(query) {
    const queryLower = query.toLowerCase();
    
    // Keywords for different intents
    const skillGapKeywords = ['become', 'skills needed', 'requirements for', 'what skills', 'skill gap', 'need to learn'];
    const jobSearchKeywords = ['job', 'jobs', 'find work', 'opportunities', 'hiring', 'position', 'career opportunities'];
    const courseKeywords = ['learn', 'course', 'courses', 'study', 'tutorial', 'training', 'how to', 'education'];
    
    // Extract job titles
    const jobTitles = Object.keys(SKILLS_DATABASE);
    const mentionedJob = jobTitles.find(job => queryLower.includes(job));
    
    // Extract skills
    const allSkills = [...new Set(Object.values(SKILLS_DATABASE).flat())];
    const mentionedSkills = allSkills.filter(skill => 
      queryLower.includes(skill.toLowerCase())
    );
    
    // Extract location (basic detection)
    const locationKeywords = ['in ', ' at ', 'near ', 'location'];
    let location = null;
    const locationMatch = queryLower.match(/(?:in|at|near)\s+([a-zA-Z\s,]+)/);
    if (locationMatch) {
      location = locationMatch[1].trim();
    }
    
    // Determine intent based on keywords
    if (skillGapKeywords.some(keyword => queryLower.includes(keyword)) || mentionedJob) {
      return {
        type: 'skill_gap',
        targetJob: mentionedJob,
        location: null,
        skills: mentionedSkills
      };
    }
    
    if (jobSearchKeywords.some(keyword => queryLower.includes(keyword))) {
      return {
        type: 'job_search',
        targetJob: mentionedJob,
        location: location,
        skills: mentionedSkills
      };
    }
    
    if (courseKeywords.some(keyword => queryLower.includes(keyword)) || mentionedSkills.length > 0) {
      return {
        type: 'course_recommendation',
        targetJob: mentionedJob,
        location: null,
        skills: mentionedSkills.length > 0 ? mentionedSkills : (mentionedJob ? SKILLS_DATABASE[mentionedJob] : [])
      };
    }
    
    return {
      type: 'general',
      targetJob: mentionedJob,
      location: location,
      skills: mentionedSkills
    };
  }
}

class SkillGapAgent {
  getMissingSkills(userSkills, targetJob) {
    const requiredSkills = SKILLS_DATABASE[targetJob.toLowerCase()] || [];
    const userSkillsLower = userSkills.map(skill => skill.toLowerCase());
    
    return requiredSkills.filter(skill => 
      !userSkillsLower.includes(skill.toLowerCase())
    );
  }

  async analyzeSkillGap(userSkills, targetJob) {
    if (!targetJob) {
      return {
        agent: 'skill_gap',
        response: 'Please specify the job role you\'re interested in (e.g., "data scientist", "web developer").'
      };
    }

    const missingSkills = this.getMissingSkills(userSkills, targetJob);
    const requiredSkills = SKILLS_DATABASE[targetJob.toLowerCase()] || [];
    
    const matchingSkills = userSkills.filter(skill => 
      requiredSkills.some(req => req.toLowerCase() === skill.toLowerCase())
    );

    return {
      agent: 'skill_gap',
      targetJob,
      userSkills,
      requiredSkills,
      matchingSkills,
      missingSkills,
      response: missingSkills.length > 0 
        ? `For a ${targetJob} role, you're missing these key skills: ${missingSkills.join(', ')}. You already have: ${matchingSkills.join(', ') || 'none of the required skills'}.`
        : `Great! You have all the required skills for a ${targetJob} role.`
    };
  }
}

class JobFinderAgent {
  findJobs(userSkills, location = null) {
    let matchingJobs = JOBS_DATABASE.filter(job => {
      const skillMatch = job.skills.some(skill => 
        userSkills.some(userSkill => 
          userSkill.toLowerCase() === skill.toLowerCase()
        )
      );
      
      const locationMatch = !location || 
        job.location.toLowerCase().includes(location.toLowerCase());
      
      return skillMatch && locationMatch;
    });

    // Sort by skill match count
    matchingJobs = matchingJobs.map(job => ({
      ...job,
      matchCount: job.skills.filter(skill => 
        userSkills.some(userSkill => 
          userSkill.toLowerCase() === skill.toLowerCase()
        )
      ).length
    })).sort((a, b) => b.matchCount - a.matchCount).slice(0, 5);

    return {
      agent: 'job_finder',
      jobs: matchingJobs,
      response: matchingJobs.length > 0 
        ? `Found ${matchingJobs.length} job opportunities matching your skills!`
        : 'No jobs found matching your current skills. Consider expanding your skill set!'
    };
  }
}

class CourseRecommenderAgent {
  recommendCourses(skills) {
    if (!skills || skills.length === 0) {
      return {
        agent: 'course_recommender',
        response: 'Please specify which skills you\'d like to learn.'
      };
    }

    const recommendations = {};
    skills.forEach(skill => {
      const courses = COURSES_DATABASE[skill];
      if (courses) {
        recommendations[skill] = courses;
      }
    });

    return {
      agent: 'course_recommender',
      recommendations,
      response: Object.keys(recommendations).length > 0 
        ? `Found course recommendations for: ${Object.keys(recommendations).join(', ')}`
        : 'No courses found for the specified skills. Try more general skill terms.'
    };
  }
}

// API Routes
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userSkills = [] } = req.body;
    
    console.log('📨 Received message:', message);
    console.log('👤 User skills:', userSkills);
    
    const conversationAgent = new ConversationAgent();
    const result = await conversationAgent.processQuery(message, userSkills);
    
    console.log('🤖 Agent response:', result.agent);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process your request. Please try again.'
    });
  }
});

app.get('/api/skills', (req, res) => {
  const allSkills = [...new Set(Object.values(SKILLS_DATABASE).flat())];
  res.json({ skills: allSkills.sort() });
});

app.get('/api/jobs', (req, res) => {
  res.json({ jobs: JOBS_DATABASE });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    githubApiConfigured: !!GITHUB_API_KEY,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 CareerMate server running on http://localhost:${PORT}`);
  console.log(`📝 GitHub API Key configured: ${GITHUB_API_KEY ? '✅ Yes' : '❌ No'}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});