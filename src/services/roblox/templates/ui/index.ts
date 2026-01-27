/**
 * UI/UX Templates
 * 
 * Pre-built UI systems for Roblox games.
 */

import type { RobloxTemplate } from '../../template-metadata';

export const uiTemplates: RobloxTemplate[] = [
    {
        metadata: {
            id: 'main-menu',
            name: 'Main Menu UI',
            description: 'Professional main menu with play, settings, and credits buttons.',
            category: 'ui',
            difficulty: 'beginner',
            tags: ['ui', 'menu', 'gui'],
            estimatedTime: 20
        },
        serverScripts: [],
        clientScripts: [{
            path: 'src/StarterPlayer/StarterPlayerScripts/MainMenu.client.lua',
            type: 'LocalScript',
            content: `-- Main Menu UI
local Players = game:GetService("Players")
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "MainMenu"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

-- Background
local background = Instance.new("Frame")
background.Size = UDim2.new(1, 0, 1, 0)
background.BackgroundColor3 = Color3.fromRGB(20, 20, 20)
background.BorderSizePixel = 0
background.Parent = screenGui

-- Title
local title = Instance.new("TextLabel")
title.Size = UDim2.new(0, 600, 0, 100)
title.Position = UDim2.new(0.5, -300, 0.2, 0)
title.BackgroundTransparency = 1
title.Text = "MY AWESOME GAME"
title.TextColor3 = Color3.fromRGB(255, 255, 255)
title.TextSize = 48
title.Font = Enum.Font.GothamBold
title.Parent = background

-- Play button
local playButton = Instance.new("TextButton")
playButton.Size = UDim2.new(0, 300, 0, 60)
playButton.Position = UDim2.new(0.5, -150, 0.5, -90)
playButton.BackgroundColor3 = Color3.fromRGB(0, 200, 100)
playButton.BorderSizePixel = 0
playButton.Text = "PLAY"
playButton.TextColor3 = Color3.fromRGB(255, 255, 255)
playButton.TextSize = 32
playButton.Font = Enum.Font.GothamBold
playButton.Parent = background

playButton.MouseButton1Click:Connect(function()
    screenGui.Enabled = false
end)

print("✅ Main menu initialized")
`
        }],
        sharedModules: []
    }
];
