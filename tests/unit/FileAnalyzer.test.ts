/**
 * Comprehensive unit tests for FileAnalyzer
 * Tests all language detection, symbol extraction, and analysis features
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FileAnalyzer, Language, SymbolType } from '../../src/lib/monitoring/FileAnalyzer.js';

describe('FileAnalyzer', () => {
  describe('Language Detection', () => {
    it('should detect Rust files correctly', () => {
      expect(FileAnalyzer.detectLanguage('main.rs')).toBe(Language.Rust);
      expect(FileAnalyzer.detectLanguage('src/lib.rs')).toBe(Language.Rust);
      expect(FileAnalyzer.detectLanguage('/path/to/module.rs')).toBe(Language.Rust);
    });

    it('should detect TypeScript files correctly', () => {
      expect(FileAnalyzer.detectLanguage('component.ts')).toBe(Language.TypeScript);
      expect(FileAnalyzer.detectLanguage('app.tsx')).toBe(Language.TypeScript);
      expect(FileAnalyzer.detectLanguage('types/index.ts')).toBe(Language.TypeScript);
    });

    it('should detect JavaScript files correctly', () => {
      expect(FileAnalyzer.detectLanguage('script.js')).toBe(Language.JavaScript);
      expect(FileAnalyzer.detectLanguage('component.jsx')).toBe(Language.JavaScript);
      expect(FileAnalyzer.detectLanguage('utils/helper.js')).toBe(Language.JavaScript);
    });

    it('should detect Svelte files correctly', () => {
      expect(FileAnalyzer.detectLanguage('Component.svelte')).toBe(Language.Svelte);
      expect(FileAnalyzer.detectLanguage('routes/+page.svelte')).toBe(Language.Svelte);
    });

    it('should detect config files correctly', () => {
      expect(FileAnalyzer.detectLanguage('package.json')).toBe(Language.JSON);
      expect(FileAnalyzer.detectLanguage('Cargo.toml')).toBe(Language.TOML);
      expect(FileAnalyzer.detectLanguage('config.toml')).toBe(Language.TOML);
    });

    it('should detect documentation files correctly', () => {
      expect(FileAnalyzer.detectLanguage('README.md')).toBe(Language.Markdown);
      expect(FileAnalyzer.detectLanguage('docs/guide.md')).toBe(Language.Markdown);
    });

    it('should detect web files correctly', () => {
      expect(FileAnalyzer.detectLanguage('index.html')).toBe(Language.HTML);
      expect(FileAnalyzer.detectLanguage('styles.css')).toBe(Language.CSS);
    });

    it('should return Unknown for unrecognized extensions', () => {
      expect(FileAnalyzer.detectLanguage('file.xyz')).toBe(Language.Unknown);
      expect(FileAnalyzer.detectLanguage('README')).toBe(Language.Unknown);
    });

    it('should handle files without extensions', () => {
      expect(FileAnalyzer.detectLanguage('Makefile')).toBe(Language.Unknown);
      expect(FileAnalyzer.detectLanguage('LICENSE')).toBe(Language.Unknown);
    });
  });

  describe('Binary File Detection', () => {
    it('should detect image files as binary', () => {
      expect(FileAnalyzer.isBinaryFile('logo.png')).toBe(true);
      expect(FileAnalyzer.isBinaryFile('photo.jpg')).toBe(true);
      expect(FileAnalyzer.isBinaryFile('icon.svg')).toBe(true);
      expect(FileAnalyzer.isBinaryFile('favicon.ico')).toBe(true);
    });

    it('should detect executable files as binary', () => {
      expect(FileAnalyzer.isBinaryFile('program.exe')).toBe(true);
      expect(FileAnalyzer.isBinaryFile('library.dll')).toBe(true);
      expect(FileAnalyzer.isBinaryFile('lib.so')).toBe(true);
      expect(FileAnalyzer.isBinaryFile('framework.dylib')).toBe(true);
    });

    it('should detect archive files as binary', () => {
      expect(FileAnalyzer.isBinaryFile('archive.zip')).toBe(true);
      expect(FileAnalyzer.isBinaryFile('backup.tar')).toBe(true);
      expect(FileAnalyzer.isBinaryFile('compressed.gz')).toBe(true);
    });

    it('should detect text files as non-binary', () => {
      expect(FileAnalyzer.isBinaryFile('code.rs')).toBe(false);
      expect(FileAnalyzer.isBinaryFile('script.js')).toBe(false);
      expect(FileAnalyzer.isBinaryFile('readme.md')).toBe(false);
      expect(FileAnalyzer.isBinaryFile('config.json')).toBe(false);
    });
  });

  describe('File Analysis', () => {
    describe('Basic Analysis', () => {
      it('should analyze a simple Rust file', async () => {
        const content = `// Simple Rust module
pub fn hello_world() {
    if true {
        println!("Hello, world!");
    }
}

pub struct Person {
    name: String,
    age: u32,
}

enum Status {
    Active,
    Inactive,
}`;

        const analysis = await FileAnalyzer.analyzeFile('test.rs', content);

        expect(analysis.filePath).toBe('test.rs');
        expect(analysis.language).toBe(Language.Rust);
        expect(analysis.lines).toBe(13); // Non-empty, non-comment lines
        expect(analysis.size).toBe(content.length);
        expect(analysis.isBinary).toBe(false);
        expect(analysis.encoding).toBe('utf-8');
        expect(analysis.symbols).toHaveLength(3); // function, struct, enum
        expect(analysis.complexity).toBeGreaterThan(1);
      });

      it('should analyze a TypeScript file with interfaces', async () => {
        const content = `interface User {
  id: number;
  name: string;
  email?: string;
}

export class UserService {
  private users: User[] = [];

  public addUser(user: User): void {
    this.users.push(user);
  }

  public findUser(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }
}

export function validateEmail(email: string): boolean {
  return email.includes('@');
}`;

        const analysis = await FileAnalyzer.analyzeFile('user.ts', content);

        expect(analysis.language).toBe(Language.TypeScript);
        expect(analysis.symbols).toHaveLength(3); // interface, class, 1 function (validateEmail)
        
        const interfaceSymbol = analysis.symbols?.find(s => s.type === SymbolType.Interface);
        expect(interfaceSymbol?.name).toBe('User');
        
        const classSymbol = analysis.symbols?.find(s => s.type === SymbolType.Class);
        expect(classSymbol?.name).toBe('UserService');
        expect(classSymbol?.visibility).toBe('public');
      });

      it('should analyze a Svelte component', async () => {
        const content = `<script lang="ts">
  export let title: string = 'Default Title';
  export let count: number = 0;
  
  function increment() {
    count += 1;
  }
  
  $: doubled = count * 2;
  $: message = \`Count is \${count}\`;
</script>

<h1>{title}</h1>
<p>Count: {count}</p>
<p>Doubled: {doubled}</p>
<button on:click={increment}>Increment</button>`;

        const analysis = await FileAnalyzer.analyzeFile('Counter.svelte', content);

        expect(analysis.language).toBe(Language.Svelte);
        expect(analysis.symbols?.length).toBeGreaterThan(0);
        
        // Should detect reactive statements
        const reactiveSymbols = analysis.symbols?.filter(s => s.type === SymbolType.Variable);
        expect(reactiveSymbols?.length).toBeGreaterThanOrEqual(2); // doubled, message
      });

      it('should handle binary files correctly', async () => {
        const binaryContent = '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR'; // PNG header
        
        const analysis = await FileAnalyzer.analyzeFile('image.png', binaryContent);

        expect(analysis.language).toBe(Language.Unknown);
        expect(analysis.isBinary).toBe(true);
        expect(analysis.encoding).toBe('binary');
        expect(analysis.lines).toBe(0);
        expect(analysis.symbols).toBeUndefined();
        expect(analysis.dependencies).toBeUndefined();
      });
    });

    describe('Symbol Extraction', () => {
      it('should extract Rust symbols with correct visibility', async () => {
        const content = `pub fn public_function() -> String {
    String::new()
}

fn private_function() {
    // private implementation
}

pub struct PublicStruct {
    pub field: i32,
}

struct PrivateStruct {
    field: String,
}

pub enum Color {
    Red,
    Green,
    Blue,
}`;

        const analysis = await FileAnalyzer.analyzeFile('symbols.rs', content);
        const symbols = analysis.symbols!;

        expect(symbols).toHaveLength(5);
        
        const publicFn = symbols.find(s => s.name === 'public_function');
        expect(publicFn?.visibility).toBe('public');
        expect(publicFn?.type).toBe(SymbolType.Function);
        
        const privateFn = symbols.find(s => s.name === 'private_function');
        expect(privateFn?.visibility).toBe('private');
        
        const publicStruct = symbols.find(s => s.name === 'PublicStruct');
        expect(publicStruct?.visibility).toBe('public');
        expect(publicStruct?.type).toBe(SymbolType.Struct);
        
        const privateStruct = symbols.find(s => s.name === 'PrivateStruct');
        expect(privateStruct?.visibility).toBe('private');
        
        const enumSymbol = symbols.find(s => s.name === 'Color');
        expect(enumSymbol?.visibility).toBe('public');
        expect(enumSymbol?.type).toBe(SymbolType.Enum);
      });

      it('should extract JavaScript/TypeScript symbols correctly', async () => {
        const content = `export function exportedFunction() {
  return 'exported';
}

function localFunction() {
  return 'local';
}

export const arrowFunction = async (param) => {
  return param;
};

const localArrow = () => 'local arrow';

export class ExportedClass {
  constructor() {}
  
  method() {
    return 'method';
  }
}

class LocalClass {
  field = 'value';
}

export interface ApiResponse {
  data: any;
  status: number;
}`;

        const analysis = await FileAnalyzer.analyzeFile('module.ts', content);
        const symbols = analysis.symbols!;

        const exportedFn = symbols.find(s => s.name === 'exportedFunction');
        expect(exportedFn?.visibility).toBe('public');
        
        const localFn = symbols.find(s => s.name === 'localFunction');
        expect(localFn?.visibility).toBe('private');
        
        const arrowFn = symbols.find(s => s.name === 'arrowFunction');
        expect(arrowFn?.visibility).toBe('public');
        expect(arrowFn?.type).toBe(SymbolType.Function);
        
        const exportedClass = symbols.find(s => s.name === 'ExportedClass');
        expect(exportedClass?.visibility).toBe('public');
        expect(exportedClass?.type).toBe(SymbolType.Class);
        
        const interface_ = symbols.find(s => s.name === 'ApiResponse');
        expect(interface_?.type).toBe(SymbolType.Interface);
      });
    });

    describe('Dependency Extraction', () => {
      it('should extract Rust dependencies', async () => {
        const content = `use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::models::User;
use super::utils;

fn main() {
    println!("Hello");
}`;

        const analysis = await FileAnalyzer.analyzeFile('deps.rs', content);
        const deps = analysis.dependencies!;

        expect(deps).toContain('std::collections::HashMap');
        expect(deps).toContain('serde::{Deserialize, Serialize}');
        expect(deps).toContain('crate::models::User');
        expect(deps).toContain('super::utils');
      });

      it('should extract JavaScript/TypeScript imports', async () => {
        const content = `import React from 'react';
import { useState, useEffect } from 'react';
import type { User } from './types';
import * as utils from '../utils';
import './styles.css';

const component = () => {
  return <div>Hello</div>;
};`;

        const analysis = await FileAnalyzer.analyzeFile('component.tsx', content);
        const deps = analysis.dependencies!;

        expect(deps).toContain('react');
        expect(deps).toContain('./types');
        expect(deps).toContain('../utils');
        expect(deps).toContain('./styles.css');
      });
    });

    describe('Complexity Calculation', () => {
      it('should calculate complexity for simple function', async () => {
        const content = `function simple() {
  return true;
}`;

        const analysis = await FileAnalyzer.analyzeFile('simple.js', content);
        expect(analysis.complexity).toBe(1); // Base complexity
      });

      it('should calculate complexity with conditionals', async () => {
        const content = `function complex(x, y, z) {
  if (x > 0) {
    if (y > 0) {
      return x + y;
    } else {
      return x - y;
    }
  } else if (x < 0) {
    return -x;
  }
  
  for (let i = 0; i < z; i++) {
    if (i % 2 === 0) {
      console.log(i);
    }
  }
  
  const result = z > 10 ? 'high' : 'low';
  return result;
}`;

        const analysis = await FileAnalyzer.analyzeFile('complex.js', content);
        // Should detect: if, if, else, else if, for, if, ternary
        expect(analysis.complexity).toBeGreaterThan(5);
      });

      it('should calculate complexity with logical operators', async () => {
        const content = `function withLogical(a, b, c) {
  if (a && b || c) {
    return true;
  }
  return false;
}`;

        const analysis = await FileAnalyzer.analyzeFile('logical.js', content);
        // Should detect: if, &&, ||
        expect(analysis.complexity).toBe(4);
      });

      it('should calculate complexity in Rust match statements', async () => {
        const content = `fn match_complexity(value: Option<i32>) -> String {
    match value {
        Some(x) if x > 0 => "positive".to_string(),
        Some(x) if x < 0 => "negative".to_string(),
        Some(_) => "zero".to_string(),
        None => "none".to_string(),
    }
}`;

        const analysis = await FileAnalyzer.analyzeFile('match.rs', content);
        // Should detect: match statement + if conditions
        expect(analysis.complexity).toBeGreaterThan(1);
      });
    });

    describe('Line Counting', () => {
      it('should count only non-empty, non-comment lines', async () => {
        const content = `// This is a comment
/* Multi-line
   comment */

function realCode() {
    // Another comment
    return true; // Inline comment
    
    // Empty line above
}

// Final comment`;

        const analysis = await FileAnalyzer.analyzeFile('counting.js', content);
        expect(analysis.lines).toBe(3); // function declaration, return statement, closing brace
      });

      it('should handle different comment styles', async () => {
        const content = `# Python-style comment
// C-style comment  
/* Block comment */
* Documentation
<!-- HTML comment -->

let actualCode = true;
const moreCode = false;`;

        const analysis = await FileAnalyzer.analyzeFile('comments.js', content);
        expect(analysis.lines).toBe(2); // Only the let and const lines
      });
    });

    describe('Error Handling', () => {
      it('should handle empty files', async () => {
        const analysis = await FileAnalyzer.analyzeFile('empty.js', '');
        
        expect(analysis.lines).toBe(0);
        expect(analysis.size).toBe(0);
        expect(analysis.symbols).toEqual([]);
        expect(analysis.dependencies).toEqual([]);
        expect(analysis.complexity).toBe(1); // Base complexity
      });

      it('should handle files with only whitespace', async () => {
        const content = '   \n\n   \t\t  \n   ';
        const analysis = await FileAnalyzer.analyzeFile('whitespace.js', content);
        
        expect(analysis.lines).toBe(0);
        expect(analysis.size).toBe(content.length);
      });

      it('should handle malformed syntax gracefully', async () => {
        const content = `function broken( {
  if (incomplete
    return "malformed";
  }
}`;

        const analysis = await FileAnalyzer.analyzeFile('broken.js', content);
        
        // Should still attempt analysis without throwing
        expect(analysis.language).toBe(Language.JavaScript);
        expect(analysis.size).toBe(content.length);
        // May have partial symbol extraction
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle large files efficiently', async () => {
      // Generate a large file content
      const lines = Array.from({ length: 10000 }, (_, i) => 
        `function func${i}() { return ${i}; }`
      );
      const content = lines.join('\n');

      const startTime = performance.now();
      const analysis = await FileAnalyzer.analyzeFile('large.js', content);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(analysis.symbols?.length).toBe(10000);
      expect(analysis.lines).toBe(10000);
    });

    it('should handle files with many symbols efficiently', async () => {
      // Generate content with many different symbol types
      const functions = Array.from({ length: 1000 }, (_, i) => `export function f${i}() {}`);
      const classes = Array.from({ length: 500 }, (_, i) => `export class C${i} {}`);
      const interfaces = Array.from({ length: 300 }, (_, i) => `interface I${i} {}`);
      
      const content = [...functions, ...classes, ...interfaces].join('\n');

      const startTime = performance.now();
      const analysis = await FileAnalyzer.analyzeFile('symbols.ts', content);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(500); // Should be fast
      expect(analysis.symbols?.length).toBe(1800);
    });
  });
});