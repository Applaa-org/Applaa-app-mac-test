/**
 * Feature-Specific System Prompt Generation
 * 
 * Generates AI instructions for implementing enabled app features
 * based on the app's feature configuration.
 */

import type { AppFeaturesConfig, AppType } from '../types/app-features';

/**
 * Generate feature-specific instructions for the AI based on enabled features
 */
export function generateFeatureInstructions(
    appType: AppType,
    features?: AppFeaturesConfig
): string {
    if (!features) {
        return '';
    }

    const instructions: string[] = [];

    // Add header
    instructions.push(`
# 🎯 **APP FEATURES CONFIGURATION**

**This app has the following features enabled. You MUST implement them according to these specifications:**
`);

    // AI Capabilities
    if (features.ai) {
        instructions.push(generateAIInstructions(appType, features.ai));
    }

    // Monetization
    if (features.monetization) {
        instructions.push(generateMonetizationInstructions(appType, features.monetization));
    }

    // Platform Features
    if (features.platform) {
        instructions.push(generatePlatformInstructions(appType, features.platform));
    }

    // Gamification (for games)
    if (features.gamification) {
        instructions.push(generateGamificationInstructions(appType, features.gamification));
    }

    // Integrations
    if (features.integrations) {
        instructions.push(generateIntegrationsInstructions(appType, features.integrations));
    }

    return instructions.join('\n');
}

function generateAIInstructions(appType: AppType, ai: any): string {
    const instructions: string[] = [`## 🤖 **AI CAPABILITIES**\n`];

    if (ai.textGeneration?.enabled) {
        instructions.push(`
### Text Generation
**Model**: ${ai.textGeneration.model}
**Max Tokens**: ${ai.textGeneration.maxTokens || 1000}
**Temperature**: ${ai.textGeneration.temperature || 0.7}

**Implementation**:
\`\`\`typescript
// Install: npm install openai @anthropic-ai/sdk
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Store API key in .env
});

export async function generateText(prompt: string) {
  const completion = await openai.chat.completions.create({
    model: '${ai.textGeneration.model}',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: ${ai.textGeneration.maxTokens || 1000},
    temperature: ${ai.textGeneration.temperature || 0.7},
  });
  
  return completion.choices[0].message.content;
}
\`\`\`

**Usage Example**:
- Create a component that accepts user input
- Call generateText() with the user's prompt
- Display the AI-generated response
- Add loading states and error handling
`);
    }

    if (ai.imageGeneration?.enabled) {
        instructions.push(`
### Image Generation
**Model**: ${ai.imageGeneration.model}
**Size**: ${ai.imageGeneration.imageSize || '1024x1024'}
**Quality**: ${ai.imageGeneration.quality || 'standard'}

**Implementation**:
\`\`\`typescript
export async function generateImage(prompt: string) {
  const response = await openai.images.generate({
    model: '${ai.imageGeneration.model}',
    prompt: prompt,
    size: '${ai.imageGeneration.imageSize || '1024x1024'}',
    quality: '${ai.imageGeneration.quality || 'standard'}',
  });
  
  return response.data[0].url;
}
\`\`\`
`);
    }

    if (ai.audioGeneration?.enabled) {
        instructions.push(`
### Audio Generation
**Model**: ${ai.audioGeneration.model}

**Implementation**: Use ElevenLabs API for text-to-speech, sound effects, or music generation.
`);
    }

    if (ai.videoGeneration?.enabled) {
        instructions.push(`
### Video Generation
**Model**: ${ai.videoGeneration.model}
**Resolution**: ${ai.videoGeneration.resolution || '1080p'}

**Implementation**: Use OpenAI Sora API for video generation from text descriptions.
`);
    }

    return instructions.join('\n');
}

function generateMonetizationInstructions(appType: AppType, monetization: any): string {
    const instructions: string[] = [`## 💳 **MONETIZATION**\n`];

    if (monetization.payment?.enabled) {
        const providers = monetization.payment.providers || [];
        const model = monetization.payment.monetizationModel || 'freemium';

        instructions.push(`
### Payment Integration
**Model**: ${model}
**Providers**: ${providers.join(', ')}

**Implementation**:
${providers.includes('revenuecat') ? `
#### RevenueCat Integration
\`\`\`typescript
// Install: npm install react-native-purchases (for mobile) or @revenuecat/purchases-js (for web)
import Purchases from '@revenuecat/purchases-js';

// Initialize RevenueCat
Purchases.configure({
  apiKey: process.env.REVENUECAT_API_KEY,
});

// Check subscription status
const customerInfo = await Purchases.getCustomerInfo();
const isPremium = customerInfo.entitlements.active['premium'] !== undefined;

// Show paywall
const offerings = await Purchases.getOfferings();
if (offerings.current) {
  // Display subscription options
}
\`\`\`
` : ''}

${providers.includes('stripe') ? `
#### Stripe Integration
\`\`\`typescript
// Install: npm install @stripe/stripe-js @stripe/react-stripe-js
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Create payment component with Stripe Elements
\`\`\`
` : ''}

**UI Requirements**:
- Create a pricing page showing subscription tiers
- Implement a paywall for premium features
- Add subscription management page
- Show current subscription status in user profile
`);
    }

    if (monetization.ads?.enabled) {
        const providers = monetization.ads.providers || [];

        if (appType === 'web' && providers.includes('adsense')) {
            instructions.push(`
### Google AdSense (Web)
**Ad Units**: ${Object.keys(monetization.ads.adUnitIds || {}).join(', ')}

**Implementation**:
\`\`\`typescript
// Add to public/index.html or _document.tsx
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
     crossorigin="anonymous"></script>

// Create AdSense component
export function AdSenseAd({ slot, format = 'auto' }: { slot: string; format?: string }) {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  return (
    <ins className="adsbygoogle"
         style={{ display: 'block' }}
         data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
         data-ad-slot={slot}
         data-ad-format={format}
         data-full-width-responsive="true"></ins>
  );
}
\`\`\`

**Ad Placement**:
- Banner ad in header or sidebar
- In-content ads between sections
- Footer ad
- Responsive ad units for mobile
`);
        }

        if ((appType === 'expo' || appType === 'godot') && providers.includes('admob')) {
            instructions.push(`
### Google AdMob (Mobile)
**Ad Units**:
- Banner: ${monetization.ads.adUnitIds?.banner || 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY'}
- Interstitial: ${monetization.ads.adUnitIds?.interstitial || 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY'}
- Rewarded: ${monetization.ads.adUnitIds?.rewarded || 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY'}

**Implementation (Expo)**:
\`\`\`typescript
// Install: npx expo install expo-ads-admob
import { AdMobBanner, AdMobInterstitial, AdMobRewarded } from 'expo-ads-admob';

// Banner Ad
<AdMobBanner
  bannerSize="fullBanner"
  adUnitID="${monetization.ads.adUnitIds?.banner || 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY'}"
  servePersonalizedAds={false} // COPPA compliance
  onDidFailToReceiveAdWithError={(error) => console.error(error)}
/>

// Interstitial Ad
await AdMobInterstitial.setAdUnitID('${monetization.ads.adUnitIds?.interstitial || 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY'}');
await AdMobInterstitial.requestAdAsync();
await AdMobInterstitial.showAdAsync();

// Rewarded Video Ad
await AdMobRewarded.setAdUnitID('${monetization.ads.adUnitIds?.rewarded || 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY'}');
await AdMobRewarded.requestAdAsync();
await AdMobRewarded.showAdAsync();
\`\`\`

**Ad Placement**:
- Banner ad at bottom of main screens
- Interstitial ad between level transitions or major actions
- Rewarded video ad for in-app currency or premium features
- COPPA compliance: Set servePersonalizedAds={false} for kids' apps
`);
        }
    }

    return instructions.join('\n');
}

function generatePlatformInstructions(appType: AppType, platform: any): string {
    const instructions: string[] = [`## 📱 **PLATFORM FEATURES**\n`];

    if (platform.haptics?.enabled && appType === 'expo') {
        instructions.push(`
### Haptics (Expo)
**Patterns**: ${platform.haptics.patterns?.join(', ') || 'light, medium, heavy'}

**Implementation**:
\`\`\`typescript
import * as Haptics from 'expo-haptics';

// Trigger haptic feedback
export const triggerHaptic = (pattern: string) => {
  switch (pattern) {
    case 'light':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'heavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'error':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
  }
};

// Use on button presses, form submissions, etc.
<TouchableOpacity onPress={() => {
  triggerHaptic('light');
  // Handle action
}}>
\`\`\`
`);
    }

    if (platform.pushNotifications?.enabled && appType === 'expo') {
        instructions.push(`
### Push Notifications (Expo)
**Providers**: FCM, APNs

**Implementation**:
\`\`\`typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Request permissions and get push token
async function registerForPushNotificationsAsync() {
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;
    
    return token;
  }
}

// Schedule local notification
await Notifications.scheduleNotificationAsync({
  content: {
    title: "You've got mail! 📬",
    body: 'Here is the notification body',
    data: { data: 'goes here' },
  },
  trigger: { seconds: 2 },
});
\`\`\`
`);
    }

    if (platform.camera?.enabled && appType === 'expo') {
        instructions.push(`
### Camera (Expo)
**Features**: ${platform.camera.features?.join(', ') || 'photo, video, qr-scanner'}

**Implementation**:
\`\`\`typescript
import { Camera, CameraType } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';

// Request permissions
const { status } = await Camera.requestCameraPermissionsAsync();

// Camera component
<Camera
  style={{ flex: 1 }}
  type={CameraType.back}
  ref={cameraRef}
>
  {/* Camera UI */}
</Camera>

// Take photo
const photo = await cameraRef.current.takePictureAsync();

// QR Scanner
<BarCodeScanner
  onBarCodeScanned={({ type, data }) => {
    console.log(\`Scanned \${type}: \${data}\`);
  }}
  style={StyleSheet.absoluteFillObject}
/>
\`\`\`
`);
    }

    if (platform.location?.enabled && appType === 'expo') {
        instructions.push(`
### Location Services (Expo)
**Features**: ${platform.location.features?.join(', ') || 'gps, geofencing'}

**Implementation**:
\`\`\`typescript
import * as Location from 'expo-location';

// Request permissions
const { status } = await Location.requestForegroundPermissionsAsync();

// Get current location
const location = await Location.getCurrentPositionAsync({});
console.log(location.coords.latitude, location.coords.longitude);

// Watch location updates
const subscription = await Location.watchPositionAsync(
  {
    accuracy: Location.Accuracy.High,
    timeInterval: 1000,
    distanceInterval: 10,
  },
  (location) => {
    console.log('Location update:', location);
  }
);
\`\`\`
`);
    }

    if (platform.biometrics?.enabled && appType === 'expo') {
        instructions.push(`
### Biometric Authentication (Expo)
**Types**: ${platform.biometrics.types?.join(', ') || 'face-id, touch-id, fingerprint'}

**Implementation**:
\`\`\`typescript
import * as LocalAuthentication from 'expo-local-authentication';

// Check if biometrics are available
const hasHardware = await LocalAuthentication.hasHardwareAsync();
const isEnrolled = await LocalAuthentication.isEnrolledAsync();

// Authenticate
const result = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Authenticate to access your account',
  fallbackLabel: 'Use passcode',
});

if (result.success) {
  // Authentication successful
}
\`\`\`
`);
    }

    return instructions.join('\n');
}

function generateGamificationInstructions(appType: AppType, gamification: any): string {
    const instructions: string[] = [`## 🎮 **GAMIFICATION FEATURES**\n`];

    if (gamification.achievements?.enabled) {
        instructions.push(`
### Achievements System
**Platforms**: ${gamification.achievements.platforms?.join(', ') || 'custom'}

**Implementation**:
\`\`\`gdscript
# Create achievements.gd
extends Node

var achievements = {
    "first_win": {
        "name": "First Victory",
        "description": "Win your first game",
        "unlocked": false,
        "icon": "res://assets/achievements/first_win.png"
    },
    "speed_demon": {
        "name": "Speed Demon",
        "description": "Complete a level in under 30 seconds",
        "unlocked": false,
        "icon": "res://assets/achievements/speed_demon.png"
    }
}

func unlock_achievement(achievement_id: String):
    if achievements.has(achievement_id) and not achievements[achievement_id].unlocked:
        achievements[achievement_id].unlocked = true
        show_achievement_notification(achievement_id)
        save_achievements()

func show_achievement_notification(achievement_id: String):
    var achievement = achievements[achievement_id]
    # Show popup notification
    print("Achievement Unlocked: ", achievement.name)
\`\`\`
`);
    }

    if (gamification.leaderboards?.enabled) {
        instructions.push(`
### Leaderboards
**Platforms**: ${gamification.leaderboards.platforms?.join(', ') || 'custom'}
**Types**: ${gamification.leaderboards.types?.join(', ') || 'global, friends'}

**Implementation**:
\`\`\`gdscript
# Create leaderboard.gd
extends Node

func submit_score(player_name: String, score: int):
    # Submit to Firebase or custom backend
    var data = {
        "player_name": player_name,
        "score": score,
        "timestamp": Time.get_unix_time_from_system()
    }
    # API call to backend

func get_leaderboard(type: String = "global"):
    # Fetch leaderboard data
    # Return top 10 scores
    pass
\`\`\`
`);
    }

    if (gamification.progression?.enabled) {
        instructions.push(`
### Progression System
**Features**: ${gamification.progression.features?.join(', ') || 'levels, xp'}

**Implementation**:
\`\`\`gdscript
# Create progression.gd
extends Node

var player_data = {
    "level": 1,
    "xp": 0,
    "xp_to_next_level": 100
}

func add_xp(amount: int):
    player_data.xp += amount
    check_level_up()

func check_level_up():
    while player_data.xp >= player_data.xp_to_next_level:
        player_data.xp -= player_data.xp_to_next_level
        player_data.level += 1
        player_data.xp_to_next_level = int(player_data.xp_to_next_level * 1.5)
        on_level_up()

func on_level_up():
    print("Level Up! Now level ", player_data.level)
    # Show level up animation
\`\`\`
`);
    }

    return instructions.join('\n');
}

function generateIntegrationsInstructions(appType: AppType, integrations: any): string {
    const instructions: string[] = [`## 🔌 **INTEGRATIONS**\n`];

    if (integrations.maps?.enabled) {
        instructions.push(`
### Maps Integration
**Provider**: ${integrations.maps.provider || 'google-maps'}

**Implementation**:
\`\`\`typescript
// Install: npm install @react-google-maps/api
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

<LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}>
  <GoogleMap
    mapContainerStyle={{ width: '100%', height: '400px' }}
    center={{ lat: 37.7749, lng: -122.4194 }}
    zoom={10}
  >
    <Marker position={{ lat: 37.7749, lng: -122.4194 }} />
  </GoogleMap>
</LoadScript>
\`\`\`
`);
    }

    if (integrations.charts?.enabled) {
        instructions.push(`
### Charts & Visualization
**Library**: ${integrations.charts.library || 'chart-js'}

**Implementation**:
\`\`\`typescript
// Install: npm install chart.js react-chartjs-2
import { Line, Bar, Pie } from 'react-chartjs-2';

const data = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [{
    label: 'Sales',
    data: [12, 19, 3, 5, 2, 3],
    borderColor: 'rgb(75, 192, 192)',
    tension: 0.1
  }]
};

<Line data={data} />
\`\`\`
`);
    }

    return instructions.join('\n');
}
