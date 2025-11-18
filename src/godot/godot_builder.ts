import * as fs from "node:fs";
import * as path from "node:path";
import log from "electron-log";
import type { GameSpecification } from "../ipc/handlers/godot_handlers";

const logger = log.scope("godot_builder");

/**
 * Builds a complete Godot game from a Game Specification JSON
 */
export async function buildGodotGameFromSpec(
  appPath: string,
  spec: GameSpecification
): Promise<void> {
  try {
    logger.info(`Building Applaa game from specification: ${spec.game.name}`);

    const projectPath = path.join(appPath, "godot-project");
    const scenesPath = path.join(projectPath, "scenes");
    const scriptsPath = path.join(projectPath, "scripts");
    const assetsPath = path.join(projectPath, "assets");

    // Ensure directories exist
    fs.mkdirSync(scenesPath, { recursive: true });
    fs.mkdirSync(scriptsPath, { recursive: true });
    fs.mkdirSync(assetsPath, { recursive: true });

    // Save game specification
    const specPath = path.join(projectPath, "game_spec.json");
    fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));

    // Create main scene
    await createMainScene(scenesPath, scriptsPath, spec);

    // Create player scene
    await createPlayerScene(scenesPath, scriptsPath, spec);

    // Create enemy scenes
    for (const enemy of spec.enemies) {
      await createEnemyScene(scenesPath, scriptsPath, enemy);
    }

    // Create level scenes
    for (const level of spec.levels) {
      await createLevelScene(scenesPath, scriptsPath, level, spec);
    }

    // Create game manager script
    await createGameManager(scriptsPath, spec);

    logger.info(`Successfully built Applaa game: ${spec.game.name}`);
  } catch (error) {
    logger.error("Failed to build Applaa game:", error);
    throw error;
  }
}

async function createMainScene(
  scenesPath: string,
  scriptsPath: string,
  spec: GameSpecification
): Promise<void> {
  const mainScenePath = path.join(scenesPath, "Main.tscn");
  const mainScriptPath = path.join(scriptsPath, "Main.gd");

  // Create main scene file
  const mainScene = `[gd_scene load_steps=2 format=3 uid="uid://main_scene"]

[ext_resource type="Script" path="res://scripts/Main.gd" id="1_main"]

[node name="Main" type="Node2D"]
script = ExtResource("1_main")

[node name="GameManager" parent="." instance=ExtResource("2_game_manager")]

[node name="UI" type="CanvasLayer" parent="."]
`;

  fs.writeFileSync(mainScenePath, mainScene);

  // Create main script
  const mainScript = `extends Node2D

func _ready():
	print("${spec.game.name} - ${spec.game.description}")
	print("Genre: ${spec.game.genre}")
	print("Version: ${spec.game.version}")
`;
  fs.writeFileSync(mainScriptPath, mainScript);
}

async function createPlayerScene(
  scenesPath: string,
  scriptsPath: string,
  spec: GameSpecification
): Promise<void> {
  const playerScenePath = path.join(scenesPath, "Player.tscn");
  const playerScriptPath = path.join(scriptsPath, "Player.gd");

  const player = spec.player;

  // Create player scene
  const playerScene = `[gd_scene load_steps=2 format=3 uid="uid://player_scene"]

[ext_resource type="Script" path="res://scripts/Player.gd" id="1_player"]

[node name="Player" type="CharacterBody2D"]
script = ExtResource("1_player")

[node name="Sprite2D" type="Sprite2D" parent="."]
position = Vector2(0, 0)

[node name="CollisionShape2D" type="CollisionShape2D" parent="."]
`;

  fs.writeFileSync(playerScenePath, playerScene);

  // Create player script
  const playerScript = `extends CharacterBody2D

const SPEED = ${player.speed}
const JUMP_VELOCITY = -400.0
const MAX_HEALTH = ${player.health}

var health = MAX_HEALTH
var gravity = ProjectSettings.get_setting("physics/2d/default_gravity")

func _ready():
	print("Player ${player.name} initialized")
	print("Type: ${player.type}")
	print("Health: ", health)
	print("Speed: ", SPEED)
${player.abilities ? player.abilities.map(a => `	print("Ability: ${a}")`).join('\n') : ''}

func _physics_process(delta):
	# Add gravity
	if not is_on_floor():
		velocity.y += gravity * delta

	# Handle jump
	if Input.is_action_just_pressed("ui_accept") and is_on_floor():
		velocity.y = JUMP_VELOCITY

	# Handle horizontal movement
	var direction = Input.get_axis("ui_left", "ui_right")
	if direction:
		velocity.x = direction * SPEED
	else:
		velocity.x = move_toward(velocity.x, 0, SPEED)

	move_and_slide()

func take_damage(amount: int):
	health -= amount
	if health <= 0:
		die()

func die():
	print("Player died!")
	queue_free()
`;

  fs.writeFileSync(playerScriptPath, playerScript);
}

async function createEnemyScene(
  scenesPath: string,
  scriptsPath: string,
  enemy: GameSpecification["enemies"][0]
): Promise<void> {
  const enemyName = enemy.name.replace(/\s+/g, "_");
  const enemyScenePath = path.join(scenesPath, `${enemyName}.tscn`);
  const enemyScriptPath = path.join(scriptsPath, `${enemyName}.gd`);

  // Create enemy scene
  const enemyScene = `[gd_scene load_steps=2 format=3 uid="uid://${enemyName}_scene"]

[ext_resource type="Script" path="res://scripts/${enemyName}.gd" id="1_${enemyName}"]

[node name="${enemyName}" type="CharacterBody2D"]
script = ExtResource("1_${enemyName}")

[node name="Sprite2D" type="Sprite2D" parent="."]

[node name="CollisionShape2D" type="CollisionShape2D" parent="."]
`;

  fs.writeFileSync(enemyScenePath, enemyScene);

  // Create enemy script based on behavior
  let behaviorCode = "";
  switch (enemy.behavior) {
    case "patrol":
      behaviorCode = `
	var patrol_direction = 1
	var patrol_distance = 100
	var start_position: Vector2

	func _ready():
		start_position = global_position

	func _physics_process(delta):
		# Simple patrol behavior
		if abs(global_position.x - start_position.x) > patrol_distance:
			patrol_direction *= -1
		
		velocity.x = patrol_direction * ${enemy.speed}
		move_and_slide()
`;
      break;
    case "chase":
      behaviorCode = `
	var player: Node2D = null

	func _ready():
		# Find player
		player = get_tree().get_first_node_in_group("player")

	func _physics_process(delta):
		if player:
			var direction = (player.global_position - global_position).normalized()
			velocity = direction * ${enemy.speed}
			move_and_slide()
`;
      break;
    case "shoot":
      behaviorCode = `
	var shoot_timer = 0.0
	var shoot_interval = 2.0

	func _physics_process(delta):
		shoot_timer += delta
		if shoot_timer >= shoot_interval:
			shoot()
			shoot_timer = 0.0

	func shoot():
		print("${enemy.name} shoots!")
`;
      break;
    default:
      behaviorCode = `
	func _physics_process(delta):
		# Custom behavior
		pass
`;
  }

  const enemyScript = `extends CharacterBody2D

const SPEED = ${enemy.speed}
const MAX_HEALTH = ${enemy.health}
const DAMAGE = ${enemy.damage}

var health = MAX_HEALTH

func _ready():
	print("Enemy ${enemy.name} initialized")
	print("Type: ${enemy.type}")
	print("Health: ", health)
	print("Behavior: ${enemy.behavior}")
${behaviorCode}
func take_damage(amount: int):
	health -= amount
	if health <= 0:
		die()

func die():
	print("${enemy.name} defeated!")
	queue_free()
`;

  fs.writeFileSync(enemyScriptPath, enemyScript);
}

async function createLevelScene(
  scenesPath: string,
  scriptsPath: string,
  level: GameSpecification["levels"][0],
  spec: GameSpecification
): Promise<void> {
  const levelName = level.name.replace(/\s+/g, "_");
  const levelScenePath = path.join(scenesPath, `${levelName}.tscn`);
  const levelScriptPath = path.join(scriptsPath, `${levelName}.gd`);

  // Create level scene
  let levelScene = `[gd_scene load_steps=3 format=3 uid="uid://${levelName}_scene"]

[ext_resource type="Script" path="res://scripts/${levelName}.gd" id="1_${levelName}"]
[ext_resource type="PackedScene" uid="uid://player_scene" path="res://scenes/Player.tscn" id="2_player"]

[node name="${levelName}" type="Node2D"]
script = ExtResource("1_${levelName}")

[node name="Background" type="ColorRect" parent="."]
anchors_preset = 15
anchor_right = 1.0
anchor_bottom = 1.0
color = Color(0.2, 0.3, 0.4, 1)

[node name="Player" parent="." instance=ExtResource("2_player")]
position = Vector2(${level.spawnPoints?.[0]?.x || 50}, ${level.spawnPoints?.[0]?.y || 300})
`;

  // Add obstacles
  if (level.obstacles) {
    level.obstacles.forEach((obstacle, index) => {
      levelScene += `
[node name="Obstacle${index}" type="StaticBody2D" parent="."]
position = Vector2(${obstacle.position.x}, ${obstacle.position.y})
`;
    });
  }

  // Add enemies
  spec.enemies.forEach((enemy, index) => {
    const enemyName = enemy.name.replace(/\s+/g, "_");
    levelScene += `
[node name="${enemyName}${index}" type="Node2D" parent="."]
`;
  });

  fs.writeFileSync(levelScenePath, levelScene);

  // Create level script
  const levelScript = `extends Node2D

func _ready():
	print("Level: ${level.name}")
	print("Background: ${level.background}")
	print("Obstacles: ${level.obstacles?.length || 0}")
	print("Spawn Points: ${level.spawnPoints?.length || 0}")
`;

  fs.writeFileSync(levelScriptPath, levelScript);
}

async function createGameManager(
  scriptsPath: string,
  spec: GameSpecification
): Promise<void> {
  const gameManagerPath = path.join(scriptsPath, "GameManager.gd");

  const gameManager = `extends Node

var score = 0
var current_level = 0
var player_health = ${spec.player.health}

func _ready():
	print("Game Manager initialized")
	print("Game: ${spec.game.name}")
	print("Win Condition: ${spec.logic.winCondition}")
	print("Lose Condition: ${spec.logic.loseCondition}")

func add_score(points: int):
	score += points
	print("Score: ", score)

func check_win_condition():
	# Implement win condition: ${spec.logic.winCondition}
	pass

func check_lose_condition():
	# Implement lose condition: ${spec.logic.loseCondition}
	pass
`;

  fs.writeFileSync(gameManagerPath, gameManager);
}

