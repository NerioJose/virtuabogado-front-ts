import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
    });
}

function processFile(filePath) {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // 1. Remove Dev Bypass blocks in API
    const devBypassRegex = /\s*\/\/\s*2\.\s*Fallback:\s*Dev\s*Bypass\s*Cookie\s*\(Solo\s*para\s*desarrollo\)\s*if\s*\(!user\)\s*\{\s*const\s*devBypass\s*=\s*(?:[^\n]+);\s*if\s*\(devBypass\)(?:\s*\{\s*user\s*=\s*[^;]+;\s*(?:console\.log\([^)]+\);\s*)?\}|\s*user\s*=\s*[^;]+;)\s*\}/g;
    content = content.replace(devBypassRegex, '');

    // Another variant
    const devBypassRegex2 = /\s*if\s*\(!user\)\s*\{\s*const\s*devBypass\s*=\s*(?:[^\n]+);\s*if\s*\(devBypass\)(?:\s*\{\s*user\s*=\s*[^;]+;\s*(?:console\.log\([^)]+\);\s*)?\}|\s*user\s*=\s*[^;]+;)\s*\}/g;
    content = content.replace(devBypassRegex2, '');
    
    // Variant 3
    const devBypassRegex3 = /\s*const\s*devBypass\s*=\s*[^;]+;\s*if\s*\(devBypass\)\s*user\s*=\s*\{[^}]+\}\s*as\s*any;/g;
    content = content.replace(devBypassRegex3, '');

    // 2. Remove user.id === 'dev-bypass-admin' checks 
    // Example: if (user.id === 'dev-bypass-admin') { ... } else if (!userRole) {
    content = content.replace(/\s*if\s*\(user\.id\s*===\s*'dev-bypass-admin'\)\s*\{\s*(isAdmin\s*=\s*true;|userRole\s*=\s*'ADMIN';)\s*\}\s*else\s*if/g, '\n        if');
    
    // Example: if (user.id === 'dev-bypass-admin' || userRole === 'ADMIN') {
    content = content.replace(/user\.id\s*===\s*'dev-bypass-admin'\s*\|\|\s*/g, '');
    
    // Example: if (user.id !== 'dev-bypass-admin') {
    // Replace with a check for real roles if it was just bypassing
    const roleRegex = /\s*if\s*\(user\.id\s*!==\s*'dev-bypass-admin'\)\s*\{\s*(?:\/\/[^\n]+\n\s*)*const\s*userData\s*=\s*await\s*prisma\.user\.findUnique\(.*?\}\);?\s*/g;
    
    content = content.replace(roleRegex, (match) => {
        return match.replace(/if\s*\(user\.id\s*!==\s*'dev-bypass-admin'\)\s*\{/g, 'if (!user.user_metadata?.rol) {');
    });

    // 3. Clean up `middleware.ts` 
    content = content.replace(/\s*const\s*devBypass\s*=\s*request\.cookies\.get\('virtuabogado-dev-bypass'\)\?.value\s*===\s*'true';\s*if\s*\(devBypass\)\s*return\s*response;/g, '');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Modified:', filePath);
    }
}

walk('./src/app/api', processFile);
walk('./src/utils', processFile);
walk('./src/lib', processFile);
