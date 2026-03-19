import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';

interface RobotWelcomeProps {
    isFirstTime: boolean;
    onComplete: () => void;
}

export function RobotWelcome({ isFirstTime, onComplete }: RobotWelcomeProps) {
    const [step, setStep] = useState(0);
    const [isVisible, setIsVisible] = useState(isFirstTime);
    const robotControls = useAnimation();

    const messages = [
        {
            text: "Hi there! 👋 I'm Blocky, your coding buddy!",
            animation: "walk-in",
            robotX: 15,
            robotY: 50,
            duration: 3000
        },
        {
            text: "Welcome to Blocklaa! Let's learn to code together! 🎉",
            animation: "jump-excited",
            robotX: 15,
            robotY: 50,
            duration: 3000
        },
        {
            text: "See those colorful blocks on the left? 🧩 Those are your coding tools!",
            animation: "walk-point-left",
            robotX: 5,
            robotY: 50,
            duration: 4000,
            highlight: "toolbox"
        },
        {
            text: "Drag them here to build your program! It's like digital LEGO! 🏗️",
            animation: "walk-center",
            robotX: 35,
            robotY: 50,
            duration: 4000,
            highlight: "workspace"
        },
        {
            text: "When you're ready, click the green ▶️ button to run your code!",
            animation: "point-up",
            robotX: 25,
            robotY: 30,
            duration: 3000,
            highlight: "run-button"
        },
        {
            text: "Don't worry about making mistakes - that's how we learn! Ready to start? 🚀",
            animation: "thumbs-up",
            robotX: 20,
            robotY: 50,
            duration: 3000
        }
    ];

    useEffect(() => {
        if (!isVisible) return;

        const currentMessage = messages[step];

        robotControls.start({
            left: `${currentMessage.robotX}%`,
            top: `${currentMessage.robotY}%`,
            transition: {
                type: "spring",
                stiffness: 50,
                damping: 15,
                duration: 1
            }
        });

        const timer = setTimeout(() => {
            if (step < messages.length - 1) {
                setStep(step + 1);
            } else {
                robotControls.start({
                    left: '110%',
                    top: '50%',
                    transition: { duration: 1.5 }
                }).then(() => {
                    setTimeout(() => handleClose(), 500);
                });
            }
        }, currentMessage.duration);

        return () => clearTimeout(timer);
    }, [step, isVisible]);

    const handleClose = () => {
        setIsVisible(false);
        onComplete();
        localStorage.setItem('blocklaa-welcome-seen', 'true');
    };

    const handleSkip = () => {
        robotControls.start({
            left: '110%',
            top: '50%',
            transition: { duration: 0.8 }
        }).then(() => {
            handleClose();
        });
    };

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 pointer-events-none">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black pointer-events-auto"
                    onClick={handleSkip}
                />

                {/* Walking Robot with Sprite Animation */}
                <motion.div
                    animate={robotControls}
                    initial={{ left: '-15%', top: '50%' }}
                    className="absolute pointer-events-none"
                    style={{
                        width: '180px',
                        height: '180px',
                        zIndex: 100,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    <AnimatedWalkingRobot animation={messages[step].animation} />
                </motion.div>

                {/* Speech Bubble */}
                <motion.div
                    animate={{
                        left: `${messages[step].robotX + 15}%`,
                        top: `${messages[step].robotY}%`
                    }}
                    initial={{ left: '0%', top: '50%' }}
                    className="absolute pointer-events-auto"
                    style={{
                        zIndex: 101,
                        transform: 'translateY(-50%)'
                    }}
                >
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-2xl p-4 max-w-sm relative"
                    >
                        <div className="absolute left-0 top-1/2 transform -translate-x-2 -translate-y-1/2">
                            <div className="w-4 h-4 bg-white rotate-45" />
                        </div>

                        <p className="text-lg text-gray-800 font-medium">
                            {messages[step].text}
                        </p>

                        <div className="flex justify-center gap-2 mt-3">
                            {messages.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all ${i === step
                                            ? 'w-6 bg-purple-500'
                                            : i < step
                                                ? 'w-1.5 bg-purple-300'
                                                : 'w-1.5 bg-gray-300'
                                        }`}
                                />
                            ))}
                        </div>

                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={handleSkip}
                                className="flex-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 font-medium rounded hover:bg-gray-100"
                            >
                                Skip
                            </button>
                            {step < messages.length - 1 && (
                                <button
                                    onClick={() => setStep(step + 1)}
                                    className="flex-1 px-3 py-1.5 text-sm bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg transition-shadow flex items-center justify-center gap-1"
                                >
                                    Next <ArrowRight size={14} />
                                </button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>

                {messages[step].highlight && (
                    <HighlightElement target={messages[step].highlight!} />
                )}
            </div>
        </AnimatePresence>
    );
}

// Animated Walking Robot with Sprite Frames
function AnimatedWalkingRobot({ animation }: { animation: string }) {
    const [currentFrame, setCurrentFrame] = useState(0);
    const isWalking = animation.includes('walk');

    // Walking animation frames
    const walkFrames = [
        // Resolve from built JS location so route path doesn't alter file:// lookups.
        new URL('../blocky-walk-1.png', import.meta.url).toString(), // Left leg forward
        new URL('../blocky-walk-2.png', import.meta.url).toString(), // Both legs together
        new URL('../blocky-walk-3.png', import.meta.url).toString(), // Right leg forward
        new URL('../blocky-walk-4.png', import.meta.url).toString()  // Both legs together
    ];

    // Cycle through walking frames
    useEffect(() => {
        if (!isWalking) {
            setCurrentFrame(0);
            return;
        }

        const interval = setInterval(() => {
            setCurrentFrame(prev => (prev + 1) % walkFrames.length);
        }, 150); // Change frame every 150ms for smooth walking

        return () => clearInterval(interval);
    }, [isWalking]);

    return (
        <motion.div
            className="relative w-full h-full"
            animate={getBodyAnimation(animation)}
        >
            <img
                src={isWalking ? walkFrames[currentFrame] : walkFrames[0]}
                alt="Blocky the Robot"
                className="w-full h-full object-contain drop-shadow-2xl"
                style={{
                    imageRendering: 'crisp-edges'
                }}
            />

            {/* Walking dust effect */}
            {isWalking && (
                <motion.div
                    className="absolute bottom-2 left-1/2 transform -translate-x-1/2"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 0, 0.5]
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 0.3
                    }}
                >
                    <div className="text-2xl">💨</div>
                </motion.div>
            )}
        </motion.div>
    );
}

function getBodyAnimation(type: string) {
    switch (type) {
        case 'walk-in':
        case 'walk-point-left':
        case 'walk-center':
            // Slight vertical bounce while walking
            return {
                y: [0, -3, 0, -3, 0],
                transition: {
                    repeat: Infinity,
                    duration: 0.6,
                    // Keep motion typing compatible across framer-motion versions
                }
            };
        case 'jump-excited':
            return {
                y: [0, -30, 0, -20, 0, -10, 0],
                rotate: [0, -5, 5, -3, 3, -2, 0],
                transition: {
                    duration: 1.5,
                    repeat: 2
                }
            };
        case 'point-up':
            return {
                rotate: [-3, 3, -3],
                transition: {
                    repeat: Infinity,
                    duration: 1
                }
            };
        case 'thumbs-up':
            return {
                scale: [1, 1.1, 1, 1.05, 1],
                rotate: [0, 5, -5, 3, 0],
                transition: {
                    duration: 0.8,
                    repeat: 3
                }
            };
        default:
            return {};
    }
}

function HighlightElement({ target }: { target: string }) {
    const positions: Record<string, any> = {
        'toolbox': { top: '10%', left: '0%', width: '20%', height: '80%' },
        'workspace': { top: '15%', left: '25%', width: '50%', height: '70%' },
        'run-button': { top: '8%', left: '30%', width: '10%', height: '5%' }
    };

    const pos = positions[target] || {};

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute border-4 border-yellow-400 rounded-lg pointer-events-none"
            style={{
                ...pos,
                boxShadow: '0 0 20px rgba(250, 204, 21, 0.5)',
                zIndex: 99
            }}
        >
            <motion.div
                className="absolute inset-0 border-4 border-yellow-300 rounded-lg"
                animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.5, 0.8, 0.5]
                }}
                transition={{
                    repeat: Infinity,
                    duration: 1.5
                }}
            />
        </motion.div>
    );
}
