import log from "electron-log";
import { readSettings } from "../main/settings";
import { findLanguageModel } from "../ipc/utils/findLanguageModel";
import { getModelClient } from "../ipc/utils/get_model_client";
import { generateText } from "ai";
import type { GameSpecification } from "../ipc/handlers/godot_handlers";

const logger = log.scope("game_spec_generator");

const GAME_SPEC_PROMPT = `You are an expert game designer and Godot engine specialist. Generate a complete Game Specification JSON from the user's game idea.

The specification should include:
1. Game metadata (name, description, genre, version)
2. Player character details (type, stats, abilities)
3. Enemy types with behaviors
4. Level designs with backgrounds and obstacles
5. Asset requirements (sprites, sounds, music)
6. Game logic (win/lose conditions, scoring)

Return ONLY valid JSON matching this structure:
{
  "game": {
    "name": "Game Name",
    "description": "Game description",
    "genre": "action|platformer|shooter|puzzle|rpg|strategy",
    "version": "1.0.0"
  },
  "player": {
    "name": "Player",
    "type": "character|vehicle|spaceship|custom",
    "health": 100,
    "speed": 200,
    "abilities": ["jump", "shoot"]
  },
  "enemies": [
    {
      "name": "Enemy Name",
      "type": "basic|boss|flying|ground",
      "health": 50,
      "speed": 100,
      "damage": 10,
      "behavior": "patrol|chase|shoot|custom"
    }
  ],
  "levels": [
    {
      "name": "Level 1",
      "background": "forest|desert|space|city|custom",
      "obstacles": [
        {
          "type": "platform|spike|wall",
          "position": {"x": 100, "y": 200}
        }
      ],
      "spawnPoints": [
        {"x": 50, "y": 300}
      ]
    }
  ],
  "assets": {
    "sprites": [
      {"name": "player", "path": "res://assets/sprites/player.png", "type": "character"}
    ],
    "sounds": [
      {"name": "jump", "path": "res://assets/sounds/jump.wav", "type": "sfx"}
    ],
    "music": [
      {"name": "background", "path": "res://assets/music/background.ogg"}
    ]
  },
  "logic": {
    "winCondition": "defeat_all_enemies|reach_goal|collect_items",
    "loseCondition": "health_zero|time_out",
    "scoring": {
      "pointsPerKill": 100,
      "pointsPerLevel": 500
    }
  }
}

Make the game fun, balanced, and suitable for the Godot engine.`;

export async function generateGameSpecification(
  userPrompt: string,
  settings: ReturnType<typeof readSettings>
): Promise<GameSpecification> {
  try {
    logger.info(`Generating game specification from prompt: ${userPrompt}`);

    const modelOption = await findLanguageModel(settings.selectedModel);
    if (!modelOption) {
      throw new Error(
        `No language model found for ${settings.selectedModel.provider}/${settings.selectedModel.name}`
      );
    }

    const { modelClient } = await getModelClient(
      settings.selectedModel,
      settings
    );

    const result = await generateText({
      model: modelClient.model,
      system: GAME_SPEC_PROMPT,
      prompt: userPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    logger.info(`AI response received: ${result.text.substring(0, 200)}...`);

    // Parse JSON from response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }

    const spec = JSON.parse(jsonMatch[0]) as GameSpecification;

    // Validate required fields
    if (!spec.game || !spec.player || !spec.enemies || !spec.levels) {
      throw new Error("Invalid game specification structure");
    }

    logger.info(`Successfully generated game specification for: ${spec.game.name}`);

    return spec;
  } catch (error) {
    logger.error("Failed to generate game specification:", error);
    throw error;
  }
}

