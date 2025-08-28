import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAppSchema } from '@/lib/validations'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: apps, error } = await supabase
      .from('apps')
      .select(`
        *,
        dev_environments (
          id,
          status,
          preview_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching apps:', error)
      return NextResponse.json({ error: 'Failed to fetch apps' }, { status: 500 })
    }

    return NextResponse.json({ apps })
  } catch (error) {
    console.error('Error in GET /api/apps:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createAppSchema.parse(body)

    const appId = uuidv4()
    
    // Create the app
    const { data: app, error: appError } = await supabase
      .from('apps')
      .insert({
        id: appId,
        user_id: user.id,
        ...validatedData,
        status: 'creating',
      })
      .select()
      .single()

    if (appError) {
      console.error('Error creating app:', appError)
      return NextResponse.json({ error: 'Failed to create app' }, { status: 500 })
    }

    // Create dev environment record
    const { error: devEnvError } = await supabase
      .from('dev_environments')
      .insert({
        app_id: appId,
        status: 'stopped',
      })

    if (devEnvError) {
      console.error('Error creating dev environment:', devEnvError)
    }

    // Initialize app with template files if template_id is provided
    if (validatedData.template_id) {
      try {
        await initializeAppFromTemplate(appId, validatedData.template_id, validatedData.type)
      } catch (templateError) {
        console.error('Error initializing from template:', templateError)
        // Don't fail the app creation, just log the error
      }
    }

    // Update app status to ready
    const { error: updateError } = await supabase
      .from('apps')
      .update({ status: 'ready' })
      .eq('id', appId)

    if (updateError) {
      console.error('Error updating app status:', updateError)
    }

    return NextResponse.json({ app }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/apps:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function initializeAppFromTemplate(appId: string, templateId: string, appType: string) {
  // This would initialize the app with template files
  // For now, we'll create a basic structure based on app type
  const supabase = createClient()
  
  const templateFiles = getTemplateFiles(appType, templateId)
  
  for (const file of templateFiles) {
    const storageKey = `${appId}/${file.path}`
    
    // Upload to storage
    const { error: storageError } = await supabase.storage
      .from('app-files')
      .upload(storageKey, file.content, {
        contentType: file.mime_type,
        upsert: true,
      })

    if (storageError) {
      console.error('Error uploading template file:', storageError)
      continue
    }

    // Create file record
    const { error: fileError } = await supabase
      .from('app_files')
      .insert({
        app_id: appId,
        path: file.path,
        content: file.content,
        size: new Blob([file.content]).size,
        mime_type: file.mime_type,
        hash: await generateFileHash(file.content),
        storage_path: storageKey,
      })

    if (fileError) {
      console.error('Error creating file record:', fileError)
    }
  }
}

function getTemplateFiles(appType: string, templateId: string) {
  // Basic template files based on app type
  const baseFiles = []
  
  switch (appType) {
    case 'web':
      baseFiles.push(
        {
          path: 'package.json',
          content: JSON.stringify({
            name: 'my-app',
            version: '0.1.0',
            private: true,
            scripts: {
              dev: 'next dev',
              build: 'next build',
              start: 'next start',
              lint: 'next lint'
            },
            dependencies: {
              next: '14.0.0',
              react: '^18',
              'react-dom': '^18'
            },
            devDependencies: {
              '@types/node': '^20',
              '@types/react': '^18',
              '@types/react-dom': '^18',
              eslint: '^8',
              'eslint-config-next': '14.0.0',
              typescript: '^5'
            }
          }, null, 2),
          mime_type: 'application/json',
        },
        {
          path: 'src/app/page.tsx',
          content: `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold">Welcome to your new app!</h1>
        <p className="mt-4 text-lg">Start building something amazing.</p>
      </div>
    </main>
  )
}`,
          mime_type: 'text/typescript',
        }
      )
      break
      
    case 'expo':
      baseFiles.push(
        {
          path: 'package.json',
          content: JSON.stringify({
            name: 'my-expo-app',
            version: '1.0.0',
            main: 'node_modules/expo/AppEntry.js',
            scripts: {
              start: 'expo start',
              android: 'expo start --android',
              ios: 'expo start --ios',
              web: 'expo start --web'
            },
            dependencies: {
              expo: '~49.0.0',
              react: '18.2.0',
              'react-native': '0.72.0'
            },
            devDependencies: {
              '@babel/core': '^7.20.0'
            }
          }, null, 2),
          mime_type: 'application/json',
        },
        {
          path: 'App.tsx',
          content: `import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to your Expo app!</Text>
      <Text>Start building something amazing.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});`,
          mime_type: 'text/typescript',
        }
      )
      break
      
    case 'flutter':
      baseFiles.push(
        {
          path: 'pubspec.yaml',
          content: `name: my_flutter_app
description: A new Flutter project.
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^2.0.0

flutter:
  uses-material-design: true`,
          mime_type: 'text/yaml',
        },
        {
          path: 'lib/main.dart',
          content: `import 'package:flutter/material.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: MyHomePage(title: 'Welcome to Flutter'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  MyHomePage({Key? key, required this.title}) : super(key: key);

  final String title;

  @override
  _MyHomePageState createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text(
              'Welcome to your Flutter app!',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            SizedBox(height: 16),
            Text('Start building something amazing.'),
          ],
        ),
      ),
    );
  }
}`,
          mime_type: 'text/dart',
        }
      )
      break
  }
  
  return baseFiles
}

async function generateFileHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}