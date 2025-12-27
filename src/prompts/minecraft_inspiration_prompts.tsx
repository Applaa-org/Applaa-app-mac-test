import React from 'react';
import {
    Sword,
    Shield,
    Car,
    Navigation,
    Crosshair,
    Plane,
    ShieldAlert,
    Users,
    Truck,
    Zap,
    Castle,
    Flame,
    Bomb,
    Ghost,
    Target,
    Wind,
    ArrowUp,
    Map,
    Eye,
    Axe,
    Heart,
    Mountain,
    Cloud,
    Search,
    Drill,
    Rocket
} from 'lucide-react';

export interface MinecraftInspiration {
    category: string;
    icon: React.ReactNode;
    prompts: Array<{
        title: string;
        description: string;
        prompt: string;
        icon: React.ReactNode;
    }>;
}

export const MINECRAFT_INSPIRATION_CATEGORIES: MinecraftInspiration[] = [
    {
        category: "Weapons & Combat",
        icon: <Crosshair className="h-5 w-5 text-red-500" />,
        prompts: [
            {
                title: "Sniper Bow",
                description: "A bow that shoots arrows super fast and straight like a sniper.",
                prompt: "Make a Sniper Bow mod. When I shoot an arrow, it should fly perfectly straight with no gravity and move 5x faster. Also, add a message in chat that says 'Target Locked!'",
                icon: <Target className="h-4 w-4" />
            },
            {
                title: "TNT Sword",
                description: "A sword that spawns TNT wherever you hit an enemy.",
                prompt: "Create a TNT Sword. Every time I hit a mob with a diamond sword, spawn a primed TNT at their position. Make sure the TNT has a short fuse!",
                icon: <Bomb className="h-4 w-4" />
            },
            {
                title: "Lightning Hammer",
                description: "Summon lightning strikes when you hit the ground.",
                prompt: "Make a Thor's Hammer mod. When I right-click with an iron axe, strike lightning at the block I'm looking at and push all nearby mobs away.",
                icon: <Zap className="h-4 w-4" />
            },
            {
                title: "Vacuum Bow",
                description: "Pulls all mobs towards the arrow's impact point.",
                prompt: "Create a Vacuum Bow mod. When an arrow lands, teleport all mobs within a 10-block radius to the arrow's location and play a wind particle effect.",
                icon: <Wind className="h-4 w-4" />
            },
            {
                title: "Frostbite Sword",
                description: "Freezes enemies in a block of ice when hit.",
                prompt: "Make a Frostbite Sword. When I hit a mob, surround them with packed ice blocks and give them Slowness 10 for 5 seconds.",
                icon: <Wind className="h-4 w-4" />
            },
            {
                title: "Laser Eyes",
                description: "Shoot fire beams from your eyes using a command.",
                prompt: "Create a Laser Eyes mod. When I type '/laser', shoot a stream of flame particles in the direction I'm looking and set any blocks or mobs hit on fire.",
                icon: <Eye className="h-4 w-4" />
            }
        ]
    },
    {
        category: "Vehicles & Transport",
        icon: <Car className="h-5 w-5 text-blue-500" />,
        prompts: [
            {
                title: "Speedy Sports Car",
                description: "Drive a minecart that moves like a fast car.",
                prompt: "Create a Sports Car mod. When I sit in a minecart, let me control it with my WASD keys on any surface, not just rails. Make it move 3x faster than a normal horse.",
                icon: <Car className="h-4 w-4" />
            },
            {
                title: "Army Tank",
                description: "A slow but powerful armored vehicle that shoots fireballs.",
                prompt: "Build an Army Tank mod. When I'm in a minecart, give me Resistance 5. When I press a chat command '/fire', shoot a large fireball in the direction I'm looking.",
                icon: <Truck className="h-4 w-4" />
            },
            {
                title: "Hoverboard",
                description: "Float above the ground on a stylish levitating board.",
                prompt: "Make a Hoverboard mod. When I ride a boat, let it fly 1 block above the ground. If I look up, it goes higher. Add blue flame particles underneath.",
                icon: <Navigation className="h-4 w-4" />
            },
            {
                title: "Underground Drill",
                description: "A vehicle that automatically tunnels through mountains.",
                prompt: "Create a Drill Vehicle mod. When I'm in a minecart, automatically destroy all blocks in a 3x3 area in front of me as I move. Drop the items as well!",
                icon: <Drill className="h-4 w-4" />
            },
            {
                title: "Turbo Boost",
                description: "Instantly launch your vehicle forward at high speed.",
                prompt: "Add a Turbo command. When I'm riding any animal or vehicle, type '/boost' to get Speed 10 for 5 seconds and display smoke particles behind me.",
                icon: <Rocket className="h-4 w-4" />
            }
        ]
    },
    {
        category: "Police & Criminals",
        icon: <ShieldAlert className="h-5 w-5 text-yellow-500" />,
        prompts: [
            {
                title: "Police Arrest System",
                description: "Freeze criminals in place using a baton.",
                prompt: "Create a Police mod. When I hit a mob or player with a stick (Baton), freeze them in place for 10 seconds and put them in a cage made of iron bars.",
                icon: <Shield className="h-4 w-4" />
            },
            {
                title: "Criminal Escape",
                description: "Smoke bombs and speed boosts for a quick getaway.",
                prompt: "Make a Criminal mod. When I type '/escape', spawn a massive cloud of smoke particles and give me Speed 4 and Invisibility for 15 seconds.",
                icon: <Ghost className="h-4 w-4" />
            },
            {
                title: "Police K9 Unit",
                description: "A loyal dog that tracks down and bites criminals.",
                prompt: "Make a Police Dog mod. Spawn a wolf named 'K9' that follows me. When I hit a mob, the wolf should instantly jump on them and give them a Slowness effect.",
                icon: <Users className="h-4 w-4" />
            },
            {
                title: "Bank Vault",
                description: "Instantly build a massive vault filled with gold and diamonds.",
                prompt: "Create a Bank Vault mod. When I type '/vault', build a 5x5 reinforced room with obsidian walls and fill it with chests containing rare gems.",
                icon: <Castle className="h-4 w-4" />
            }
        ]
    },
    {
        category: "Army & War",
        icon: <Users className="h-5 w-5 text-green-600" />,
        prompts: [
            {
                title: "Call for Backup",
                description: "Spawn a squad of iron golems to protect you.",
                prompt: "Make an Army Backup mod. When I type '/squad', spawn 4 Iron Golems named 'Soldier' around me that follow me and attack my targets.",
                icon: <Users className="h-4 w-4" />
            },
            {
                title: "Airstrike",
                description: "Ready... Aim... FIRE! Rain down TNT from the clouds.",
                prompt: "Create an Airstrike mod. When I use a command '/airstrike', spawn 20 TNT blocks high in the sky above my current position and let them rain down.",
                icon: <Flame className="h-4 w-4" />
            },
            {
                title: "Landmines",
                description: "Hidden traps that explode when stepped on.",
                prompt: "Make a Landmine mod. When I place a heavy pressure plate, it becomes a landmine. If any mob steps on it, create a huge explosion!",
                icon: <Bomb className="h-4 w-4" />
            },
            {
                title: "Medic Kit",
                description: "Heal yourself and all nearby allies instantly.",
                prompt: "Make a Medic mod. Add a command '/heal' that restores my health to full and gives Regeneration 2 to everyone within 10 blocks.",
                icon: <Heart className="h-4 w-4" />
            },
            {
                title: "Fortress Wall",
                description: "Instantly create a defensive wall of stone bricks.",
                prompt: "Create a Fortress mod. When I type '/wall', build a 20-block long, 5-block high wall of stone bricks in front of me.",
                icon: <Shield className="h-4 w-4" />
            }
        ]
    },
    {
        category: "Planes & Helicopters",
        icon: <Plane className="h-5 w-5 text-sky-500" />,
        prompts: [
            {
                title: "Apache Helicopter",
                description: "Fly a deadly attack helicopter with missile pods.",
                prompt: "Create an Apache Helicopter mod. Let me fly by holding a blaze rod. Add a command '/missile' that fires an explosive arrow with a trail of smoke.",
                icon: <Plane className="h-4 w-4" />
            },
            {
                title: "Stunt Plane",
                description: "Perform amazing aerial maneuvers with ease.",
                prompt: "Build a Stunt Plane mod. When I'm riding a pig with a saddle, let it fly perfectly wherever I look. Add a command '/loop' that spins me in a circle with sparkles.",
                icon: <Navigation className="h-4 w-4" />
            },
            {
                title: "Cargo Plane",
                description: "A large transport plane that can drop supplies.",
                prompt: "Make a Cargo Plane mod. Add a command '/drop' that spawns a chest on a parachute (chicken) that slowly falls to the ground with loot inside.",
                icon: <Truck className="h-4 w-4" />
            },
            {
                title: "Jetpack",
                description: "Strap on a jetpack and blast off into the sky.",
                prompt: "Create a Jetpack mod. While I hold coal, let me fly upwards. Display fire particles at my feet and play an explosion sound when I start.",
                icon: <Wind className="h-4 w-4" />
            }
        ]
    },
    {
        category: "World Builders",
        icon: <Castle className="h-5 w-5 text-amber-600" />,
        prompts: [
            {
                title: "Instant Modern City",
                description: "Build skyscrapers and roads with a single command.",
                prompt: "Create a City Builder mod. Add a command '/skyscraper' that builds a 30-block tall glass and stone building with floors and windows instantly.",
                icon: <Castle className="h-4 w-4" />
            },
            {
                title: "Automatic Bridge",
                description: "Walk across water as blocks appear beneath your feet.",
                prompt: "Make an Auto-Bridge mod. When I hold a gold block, automatically place glass blocks under my feet every time I walk over air or water.",
                icon: <Navigation className="h-4 w-4" />
            },
            {
                title: "Volcano Eruption",
                description: "Create a massive volcano that spews lava and ash.",
                prompt: "Build a Volcano mod. Create a command '/volcano' that builds a mountain of obsidian and starts spawning lava sources and fire at the top.",
                icon: <Flame className="h-4 w-4" />
            },
            {
                title: "Forest Creator",
                description: "Spawn a lush forest around you instantly.",
                prompt: "Make a Forest mod. Add a command '/forest' that spawns 20 different trees in a 30-block radius around my current position.",
                icon: <Axe className="h-4 w-4" />
            },
            {
                title: "Diamond Finder",
                description: "Highlight nearby diamond ores through the walls.",
                prompt: "Create a Diamond Finder mod. Add a command '/find' that turns every diamond ore within 20 blocks into a glowing beacon so I can see it.",
                icon: <Search className="h-4 w-4" />
            },
            {
                title: "Weather God",
                description: "Change the season and weather with your voice.",
                prompt: "Make a Weather God mod. Add commands '/winter' to make it snow, '/summer' to clear the sky, and '/storm' to summon a massive thunderstorm.",
                icon: <Cloud className="h-4 w-4" />
            }
        ]
    }
];
