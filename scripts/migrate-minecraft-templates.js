/**
 * One-time migration script to add manifest.json and tick.json 
 * to all existing Minecraft Bedrock templates
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TEMPLATES_DIR = path.join(__dirname, '..', 'minecraft-bedrock-templates');

function generateManifest(templateName, category) {
    return {
        format_version: 2,
        header: {
            name: templateName,
            description: `${category} - ${templateName}`,
            uuid: uuidv4(),
            version: [1, 0, 0],
            min_engine_version: [1, 20, 0]
        },
        modules: [{
            type: "data",
            uuid: uuidv4(), // DIFFERENT UUID than header
            version: [1, 0, 0]
        }]
    };
}

function generateTickJson(functionName) {
    return {
        values: [functionName.replace('.mcfunction', '')]
    };
}

function processTemplate(category, templateFile) {
    const categoryPath = path.join(TEMPLATES_DIR, category);
    const manifestPath = path.join(categoryPath, `${templateFile.replace('.mcfunction', '')}_manifest.json`);
    const tickPath = path.join(categoryPath, `${templateFile.replace('.mcfunction', '')}_tick.json`);

    // Skip if already has manifest
    if (fs.existsSync(manifestPath)) {
        console.log(`⏭️  Skipping ${category}/${templateFile} (already migrated)`);
        return false;
    }

    // Generate files
    const templateName = templateFile.replace('.mcfunction', '').replace(/-/g, ' ');
    const manifest = generateManifest(templateName, category);
    const tick = generateTickJson(templateFile);

    // Write files alongside the .mcfunction
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    fs.writeFileSync(tickPath, JSON.stringify(tick, null, 2));

    console.log(`✅ Migrated: ${category}/${templateFile}`);
    return true;
}

function main() {
    console.log('🚀 Starting Minecraft template migration...\n');

    if (!fs.existsSync(TEMPLATES_DIR)) {
        console.error(`❌ Templates directory not found: ${TEMPLATES_DIR}`);
        process.exit(1);
    }

    let migrated = 0;
    let skipped = 0;

    // Process all categories
    const categories = fs.readdirSync(TEMPLATES_DIR);

    categories.forEach(category => {
        const categoryPath = path.join(TEMPLATES_DIR, category);

        // Skip if not a directory
        if (!fs.statSync(categoryPath).isDirectory()) {
            return;
        }

        console.log(`\n📁 Processing category: ${category}`);

        // Find all .mcfunction files
        const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.mcfunction'));

        files.forEach(file => {
            const wasMigrated = processTemplate(category, file);
            if (wasMigrated) {
                migrated++;
            } else {
                skipped++;
            }
        });
    });

    console.log('\n' + '='.repeat(50));
    console.log(`🎉 Migration complete!`);
    console.log(`✅ Migrated: ${migrated} templates`);
    console.log(`⏭️  Skipped: ${skipped} templates (already migrated)`);
    console.log('='.repeat(50));

    // Verify UUID uniqueness
    console.log('\n🔍 Verifying UUID uniqueness...');
    const allUuids = [];

    categories.forEach(category => {
        const categoryPath = path.join(TEMPLATES_DIR, category);
        if (!fs.statSync(categoryPath).isDirectory()) return;

        const manifestFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('_manifest.json'));
        manifestFiles.forEach(file => {
            const manifest = JSON.parse(fs.readFileSync(path.join(categoryPath, file), 'utf-8'));
            allUuids.push(manifest.header.uuid);
            allUuids.push(manifest.modules[0].uuid);
        });
    });

    const uniqueUuids = new Set(allUuids);
    if (allUuids.length === uniqueUuids.size) {
        console.log(`✅ All ${allUuids.length} UUIDs are unique!`);
    } else {
        console.error(`❌ Found ${allUuids.length - uniqueUuids.size} duplicate UUIDs!`);
    }
}

// Run migration
main();
