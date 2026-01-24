/**
 * Educational Templates
 * 
 * Educational game templates for learning.
 */

import type { RobloxTemplate } from '../../template-metadata';

export const educationalTemplates: RobloxTemplate[] = [
    {
        metadata: {
            id: 'math-game',
            name: 'Math Quiz Game',
            description: 'Interactive math quiz game with scoring and difficulty levels.',
            category: 'educational',
            difficulty: 'beginner',
            tags: ['education', 'math', 'quiz', 'learning'],
            estimatedTime: 30,
            learningObjectives: ['Math skills', 'Problem solving', 'Quick thinking']
        },
        serverScripts: [{
            path: 'src/ServerScriptService/MathGame.server.lua',
            type: 'Script',
            content: `-- Math Quiz Game
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- Remote events
local quizEvent = Instance.new("RemoteEvent")
quizEvent.Name = "MathQuiz"
quizEvent.Parent = ReplicatedStorage

local answerEvent = Instance.new("RemoteEvent")
answerEvent.Name = "SubmitAnswer"
answerEvent.Parent = ReplicatedStorage

-- Generate math problem
local function generateProblem(difficulty)
    local operations = {"+", "-", "*"}
    local operation = operations[math.random(1, #operations)]
    
    local maxNum = difficulty == "easy" and 10 or difficulty == "medium" and 50 or 100
    local num1 = math.random(1, maxNum)
    local num2 = math.random(1, maxNum)
    
    local answer
    if operation == "+" then
        answer = num1 + num2
    elseif operation == "-" then
        answer = num1 - num2
    else
        answer = num1 * num2
    end
    
    return {
        question = num1 .. " " .. operation .. " " .. num2,
        answer = answer
    }
end

-- Player quiz data
local playerQuizData = {}

-- Request new question
quizEvent.OnServerEvent:Connect(function(player, difficulty)
    difficulty = difficulty or "easy"
    local problem = generateProblem(difficulty)
    
    playerQuizData[player.UserId] = {
        answer = problem.answer,
        startTime = tick()
    }
    
    quizEvent:FireClient(player, problem.question)
end)

-- Check answer
answerEvent.OnServerEvent:Connect(function(player, playerAnswer)
    local data = playerQuizData[player.UserId]
    if data then
        local correct = (tonumber(playerAnswer) == data.answer)
        local timeT aken = tick() - data.startTime
        
        if correct then
            local leaderstats = player:FindFirstChild("leaderstats")
            if leaderstats then
                local score = leaderstats:FindFirstChild("Score")
                if score then
                    score.Value = score.Value + math.floor(100 / timeT aken)
                end
            end
        end
        
        answerEvent:FireClient(player, correct, data.answer)
        playerQuizData[player.UserId] = nil
    end
end)

-- Create leaderboard
Players.PlayerAdded:Connect(function(player)
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player
    
    local score = Instance.new("IntValue")
    score.Name = "Score"
    score.Value = 0
    score.Parent = leaderstats
end)

print("✅ Math quiz game initialized")
`
        }],
        clientScripts: [],
        sharedModules: []
    }
];
