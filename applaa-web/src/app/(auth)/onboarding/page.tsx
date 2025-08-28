'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

interface Question {
  id: string
  question: string
  options: {
    text: string
    value: SkillLevel
    points: number
  }[]
}

const skillQuestions: Question[] = [
  {
    id: '1',
    question: 'How would you describe your programming experience?',
    options: [
      { text: 'I\'m just getting started with coding', value: 'beginner', points: 1 },
      { text: 'I can build basic applications', value: 'intermediate', points: 2 },
      { text: 'I\'m comfortable with complex projects', value: 'advanced', points: 3 },
    ],
  },
  {
    id: '2',
    question: 'Which best describes your experience with React/mobile development?',
    options: [
      { text: 'I\'ve never used React or built mobile apps', value: 'beginner', points: 1 },
      { text: 'I\'ve built a few React apps or tried mobile development', value: 'intermediate', points: 2 },
      { text: 'I regularly build React/mobile applications', value: 'advanced', points: 3 },
    ],
  },
  {
    id: '3',
    question: 'How comfortable are you with deployment and DevOps?',
    options: [
      { text: 'I\'ve never deployed an application', value: 'beginner', points: 1 },
      { text: 'I\'ve deployed apps with guidance or tutorials', value: 'intermediate', points: 2 },
      { text: 'I regularly deploy and manage applications', value: 'advanced', points: 3 },
    ],
  },
  {
    id: '4',
    question: 'What\'s your experience with AI/ML tools for development?',
    options: [
      { text: 'I\'m new to AI-assisted development', value: 'beginner', points: 1 },
      { text: 'I\'ve used AI tools like GitHub Copilot occasionally', value: 'intermediate', points: 2 },
      { text: 'I regularly use AI tools to accelerate development', value: 'advanced', points: 3 },
    ],
  },
]

export default function OnboardingPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleAnswer = (questionId: string, points: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: points }))
    
    if (currentQuestion < skillQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    }
  }

  const calculateSkillLevel = (): SkillLevel => {
    const totalPoints = Object.values(answers).reduce((sum, points) => sum + points, 0)
    const averagePoints = totalPoints / skillQuestions.length
    
    if (averagePoints <= 1.5) return 'beginner'
    if (averagePoints <= 2.5) return 'intermediate'
    return 'advanced'
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    
    try {
      const skillLevel = calculateSkillLevel()
      
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('No user found')
      }

      const { error } = await supabase
        .from('users')
        .update({
          skill_level: skillLevel,
          onboarding_completed: true,
        })
        .eq('id', user.id)

      if (error) {
        throw error
      }

      // Create default agent configurations
      const defaultAgents = [
        { agent_type: 'ui-ux', configuration: { enabled: true, skill_level: skillLevel } },
        { agent_type: 'security', configuration: { enabled: true, skill_level: skillLevel } },
        { agent_type: 'qa', configuration: { enabled: true, skill_level: skillLevel } },
        { agent_type: 'deployment', configuration: { enabled: true, skill_level: skillLevel } },
      ]

      const { error: agentsError } = await supabase
        .from('user_agents')
        .insert(
          defaultAgents.map(agent => ({
            user_id: user.id,
            ...agent,
          }))
        )

      if (agentsError) {
        console.error('Error creating default agents:', agentsError)
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Error completing onboarding:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const question = skillQuestions[currentQuestion]
  const isLastQuestion = currentQuestion === skillQuestions.length - 1
  const canProceed = answers[question.id] !== undefined

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Let's personalize your experience</CardTitle>
          <CardDescription>
            Answer a few questions to help us tailor Applaa to your skill level
          </CardDescription>
          <div className="flex justify-center mt-4">
            <div className="flex space-x-2">
              {skillQuestions.map((_, index) => (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full ${
                    index <= currentQuestion ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Question {currentQuestion + 1} of {skillQuestions.length}
            </h3>
            <p className="text-gray-700 mb-6">{question.question}</p>
            
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(question.id, option.points)}
                  className={`w-full p-4 text-left border rounded-lg transition-colors ${
                    answers[question.id] === option.points
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {option.text}
                </button>
              ))}
            </div>
          </div>

          {isLastQuestion && canProceed && (
            <div className="pt-6 border-t">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">
                  Based on your answers, we'll set up your AI agents and provide 
                  {calculateSkillLevel() === 'beginner' && ' step-by-step guidance'}
                  {calculateSkillLevel() === 'intermediate' && ' balanced assistance'}
                  {calculateSkillLevel() === 'advanced' && ' advanced tools and insights'}
                  .
                </p>
              </div>
              <Button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Setting up your workspace...
                  </div>
                ) : (
                  'Complete Setup'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}