/**
 * Multi-language file analysis engine for WitnessChain
 * Provides intelligent parsing and metrics for different file types
 */

export interface ImportExport {
  module: string;
  type: 'import' | 'export' | 'dynamic_import' | 'require';
  specifiers: string[]; // what's being imported/exported
  line: number;
  isDefault: boolean;
  isNamespace: boolean;
}

export interface FunctionInfo {
  name: string;
  line: number;
  params: string[];
  complexity: number;
  isAsync: boolean;
  isExported: boolean;
}

export interface ClassInfo {
  name: string;
  line: number;
  methods: FunctionInfo[];
  properties: string[];
  isExported: boolean;
  extends?: string;
  implements?: string[];
}

export interface FileAnalysis {
  filePath: string;
  language: Language;
  size: number;
  lines: number;
  complexity?: number;
  symbols?: Symbol[];
  dependencies?: string[];
  imports?: ImportExport[];
  exports?: ImportExport[];
  functions?: FunctionInfo[];
  classes?: ClassInfo[];
  lastModified: Date;
  encoding: string;
  isBinary: boolean;
}

export interface Symbol {
  name: string;
  type: SymbolType;
  line: number;
  column: number;
  visibility?: 'public' | 'private' | 'protected';
  params?: string[];
  returnType?: string;
}

export enum Language {
  Rust = 'rust',
  TypeScript = 'typescript',
  JavaScript = 'javascript',
  Svelte = 'svelte',
  JSON = 'json',
  TOML = 'toml',
  Markdown = 'markdown',
  HTML = 'html',
  CSS = 'css',
  Unknown = 'unknown'
}

export enum SymbolType {
  Function = 'function',
  Struct = 'struct',
  Enum = 'enum',
  Interface = 'interface',
  Class = 'class',
  Variable = 'variable',
  Constant = 'constant',
  Import = 'import',
  Export = 'export'
}

export class FileAnalyzer {
  private static readonly LANGUAGE_PATTERNS: Record<string, Language> = {
    '.rs': Language.Rust,
    '.ts': Language.TypeScript,
    '.tsx': Language.TypeScript,
    '.js': Language.JavaScript,
    '.jsx': Language.JavaScript,
    '.svelte': Language.Svelte,
    '.json': Language.JSON,
    '.toml': Language.TOML,
    '.md': Language.Markdown,
    '.html': Language.HTML,
    '.css': Language.CSS,
  };

  private static readonly BINARY_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
    '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll',
    '.so', '.dylib', '.wasm', '.bin'
  ]);

  /**
   * Detect language from file path
   */
  static detectLanguage(filePath: string): Language {
    const ext = this.getFileExtension(filePath);
    return this.LANGUAGE_PATTERNS[ext] || Language.Unknown;
  }

  /**
   * Check if file is binary
   */
  static isBinaryFile(filePath: string): boolean {
    const ext = this.getFileExtension(filePath);
    return this.BINARY_EXTENSIONS.has(ext);
  }

  /**
   * Analyze file content and extract metrics
   */
  static async analyzeFile(filePath: string, content: string): Promise<FileAnalysis> {
    const language = this.detectLanguage(filePath);
    const isBinary = this.isBinaryFile(filePath);
    
    if (isBinary) {
      return {
        filePath,
        language,
        size: content.length,
        lines: 0,
        lastModified: new Date(),
        encoding: 'binary',
        isBinary: true
      };
    }

    const lines = this.countLines(content);
    const symbols = await this.extractSymbols(content, language);
    const dependencies = await this.extractDependencies(content, language);
    const complexity = this.calculateComplexity(content, language);
    const imports = await this.extractImports(content, language);
    const exports = await this.extractExports(content, language);
    const functions = await this.extractFunctions(content, language);
    const classes = await this.extractClasses(content, language);

    return {
      filePath,
      language,
      size: content.length,
      lines,
      complexity,
      symbols,
      dependencies,
      imports,
      exports,
      functions,
      classes,
      lastModified: new Date(),
      encoding: 'utf-8',
      isBinary: false
    };
  }

  /**
   * Count lines of code (excluding empty lines and comments)
   */
  private static countLines(content: string): number {
    const lines = content.split('\n');
    return lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !this.isCommentLine(trimmed);
    }).length;
  }

  /**
   * Check if line is a comment
   */
  private static isCommentLine(line: string): boolean {
    return line.startsWith('//') || 
           line.startsWith('/*') || 
           line.startsWith('*') ||
           line.startsWith('#') ||
           line.startsWith('<!--') ||
           line.includes('//'); // Also catch inline comments for line counting
  }

  /**
   * Extract symbols from source code
   */
  private static async extractSymbols(content: string, language: Language): Promise<Symbol[]> {
    switch (language) {
      case Language.Rust:
        return this.extractRustSymbols(content);
      case Language.TypeScript:
      case Language.JavaScript:
        return this.extractJSSymbols(content);
      case Language.Svelte:
        return this.extractSvelteSymbols(content);
      default:
        return [];
    }
  }

  /**
   * Extract Rust symbols (functions, structs, enums)
   */
  private static extractRustSymbols(content: string): Symbol[] {
    const symbols: Symbol[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Function definitions
      const fnMatch = trimmed.match(/^(?:pub\s+)?fn\s+(\w+)\s*\(/);
      if (fnMatch) {
        symbols.push({
          name: fnMatch[1],
          type: SymbolType.Function,
          line: index + 1,
          column: line.indexOf('fn'),
          visibility: trimmed.startsWith('pub') ? 'public' : 'private'
        });
      }

      // Struct definitions
      const structMatch = trimmed.match(/^(?:pub\s+)?struct\s+(\w+)/);
      if (structMatch) {
        symbols.push({
          name: structMatch[1],
          type: SymbolType.Struct,
          line: index + 1,
          column: line.indexOf('struct'),
          visibility: trimmed.startsWith('pub') ? 'public' : 'private'
        });
      }

      // Enum definitions
      const enumMatch = trimmed.match(/^(?:pub\s+)?enum\s+(\w+)/);
      if (enumMatch) {
        symbols.push({
          name: enumMatch[1],
          type: SymbolType.Enum,
          line: index + 1,
          column: line.indexOf('enum'),
          visibility: trimmed.startsWith('pub') ? 'public' : 'private'
        });
      }
    });

    return symbols;
  }

  /**
   * Extract JavaScript/TypeScript symbols
   */
  private static extractJSSymbols(content: string): Symbol[] {
    const symbols: Symbol[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Function declarations
      const fnMatch = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/);
      if (fnMatch) {
        symbols.push({
          name: fnMatch[1],
          type: SymbolType.Function,
          line: index + 1,
          column: line.indexOf('function'),
          visibility: trimmed.startsWith('export') ? 'public' : 'private'
        });
      }

      // Arrow functions and const assignments
      const arrowMatch = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)\s*=>|\([^)]*\)\s*\{)/);
      if (arrowMatch) {
        symbols.push({
          name: arrowMatch[1],
          type: SymbolType.Function,
          line: index + 1,
          column: line.indexOf(arrowMatch[1]),
          visibility: trimmed.startsWith('export') ? 'public' : 'private'
        });
      }

      // Class methods
      const methodMatch = trimmed.match(/^(?:public\s+|private\s+)?(\w+)\s*\([^)]*\)\s*\{/);
      if (methodMatch && !trimmed.startsWith('function') && !trimmed.startsWith('if') && !trimmed.startsWith('while')) {
        symbols.push({
          name: methodMatch[1],
          type: SymbolType.Function,
          line: index + 1,
          column: line.indexOf(methodMatch[1]),
          visibility: trimmed.startsWith('public') ? 'public' : 'private'
        });
      }

      // Class definitions
      const classMatch = trimmed.match(/^(?:export\s+)?class\s+(\w+)/);
      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          type: SymbolType.Class,
          line: index + 1,
          column: line.indexOf('class'),
          visibility: trimmed.startsWith('export') ? 'public' : 'private'
        });
      }

      // Interface definitions (TypeScript)
      const interfaceMatch = trimmed.match(/^(?:export\s+)?interface\s+(\w+)/);
      if (interfaceMatch) {
        symbols.push({
          name: interfaceMatch[1],
          type: SymbolType.Interface,
          line: index + 1,
          column: line.indexOf('interface'),
          visibility: trimmed.startsWith('export') ? 'public' : 'private'
        });
      }
    });

    return symbols;
  }

  /**
   * Extract Svelte component symbols
   */
  private static extractSvelteSymbols(content: string): Symbol[] {
    const symbols: Symbol[] = [];
    const lines = content.split('\n');
    let inScriptTag = false;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      if (trimmed.includes('<script')) {
        inScriptTag = true;
        return;
      }
      
      if (trimmed.includes('</script>')) {
        inScriptTag = false;
        return;
      }

      if (inScriptTag) {
        // Extract JavaScript symbols within script tags
        const jsSymbols = this.extractJSSymbols(line);
        symbols.push(...jsSymbols.map(symbol => ({
          ...symbol,
          line: index + 1
        })));
      }

      // Svelte reactive statements
      const reactiveMatch = trimmed.match(/^\$:\s*(\w+)\s*=/);
      if (reactiveMatch) {
        symbols.push({
          name: reactiveMatch[1],
          type: SymbolType.Variable,
          line: index + 1,
          column: line.indexOf('$:'),
          visibility: 'private'
        });
      }
    });

    return symbols;
  }

  /**
   * Extract dependencies from source code
   */
  private static async extractDependencies(content: string, language: Language): Promise<string[]> {
    const dependencies: string[] = [];
    const lines = content.split('\n');

    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Rust use statements
      if (language === Language.Rust && trimmed.startsWith('use ')) {
        const useMatch = trimmed.match(/use\s+([^;]+);/);
        if (useMatch) {
          dependencies.push(useMatch[1]);
        }
      }
      
      // JavaScript/TypeScript imports
      if ((language === Language.TypeScript || language === Language.JavaScript) && 
          trimmed.startsWith('import ')) {
        // Handle: import ... from '...'
        const fromMatch = trimmed.match(/from\s+['"]([^'"]+)['"]/);
        if (fromMatch) {
          dependencies.push(fromMatch[1]);
        } else {
          // Handle: import '...' (side effect imports)
          const directMatch = trimmed.match(/import\s+['"]([^'"]+)['"]/);
          if (directMatch) {
            dependencies.push(directMatch[1]);
          }
        }
      }
    });

    return dependencies;
  }

  /**
   * Calculate cyclomatic complexity
   */
  private static calculateComplexity(content: string, language: Language): number {
    let complexity = 1; // Base complexity
    
    const complexityPatterns = [
      /\bif\b/g,
      /\belse\b/g,
      /\bwhile\b/g,
      /\bfor\b/g,
      /\bmatch\b/g, // Rust
      /\bswitch\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\b\?\s*:/g, // Ternary operator
      /&&/g,
      /\|\|/g
    ];

    complexityPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  /**
   * Extract import statements with detailed analysis
   */
  private static async extractImports(content: string, language: Language): Promise<ImportExport[]> {
    const imports: ImportExport[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (language === Language.Rust) {
        // Rust use statements
        const useMatch = trimmed.match(/use\s+([^;]+);/);
        if (useMatch) {
          const usePath = useMatch[1];
          const specifiers = usePath.includes('{') ? 
            usePath.match(/\{([^}]+)\}/)?.[1]?.split(',').map(s => s.trim()) || [] :
            [usePath.split('::').pop() || usePath];
          
          imports.push({
            module: usePath,
            type: 'import',
            specifiers,
            line: index + 1,
            isDefault: false,
            isNamespace: usePath.endsWith('::*')
          });
        }
      }

      if (language === Language.TypeScript || language === Language.JavaScript || language === Language.Svelte) {
        // ES6 imports: import ... from '...'
        const esImportMatch = trimmed.match(/import\s+(.*?)\s+from\s+['"]([^'"]+)['"]/);
        if (esImportMatch) {
          const importClause = esImportMatch[1];
          const module = esImportMatch[2];
          const specifiers: string[] = [];
          let isDefault = false;
          let isNamespace = false;

          // Parse import clause
          if (importClause.includes('{')) {
            // Named imports: { a, b, c }
            const namedMatch = importClause.match(/\{([^}]+)\}/);
            if (namedMatch) {
              specifiers.push(...namedMatch[1].split(',').map(s => s.trim()));
            }
          }
          
          if (importClause.includes('*')) {
            // Namespace import: * as name
            const namespaceMatch = importClause.match(/\*\s+as\s+(\w+)/);
            if (namespaceMatch) {
              specifiers.push(namespaceMatch[1]);
              isNamespace = true;
            }
          }
          
          // Check for default import
          const defaultMatch = importClause.match(/^(\w+)/);
          if (defaultMatch && !importClause.includes('{') && !importClause.includes('*')) {
            specifiers.push(defaultMatch[1]);
            isDefault = true;
          }

          imports.push({
            module,
            type: 'import',
            specifiers,
            line: index + 1,
            isDefault,
            isNamespace
          });
        }

        // Side-effect imports: import '...'
        const sideEffectMatch = trimmed.match(/import\s+['"]([^'"]+)['"]/);
        if (sideEffectMatch && !esImportMatch) {
          imports.push({
            module: sideEffectMatch[1],
            type: 'import',
            specifiers: [],
            line: index + 1,
            isDefault: false,
            isNamespace: false
          });
        }

        // Dynamic imports: import('...')
        const dynamicMatch = trimmed.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/);
        if (dynamicMatch) {
          imports.push({
            module: dynamicMatch[1],
            type: 'dynamic_import',
            specifiers: [],
            line: index + 1,
            isDefault: false,
            isNamespace: false
          });
        }

        // CommonJS require
        const requireMatch = trimmed.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
        if (requireMatch) {
          imports.push({
            module: requireMatch[1],
            type: 'require',
            specifiers: [],
            line: index + 1,
            isDefault: false,
            isNamespace: false
          });
        }
      }
    });

    return imports;
  }

  /**
   * Extract export statements with detailed analysis
   */
  private static async extractExports(content: string, language: Language): Promise<ImportExport[]> {
    const exports: ImportExport[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (language === Language.TypeScript || language === Language.JavaScript || language === Language.Svelte) {
        // Named exports: export { a, b, c }
        const namedExportMatch = trimmed.match(/export\s*\{\s*([^}]+)\s*\}/);
        if (namedExportMatch) {
          const specifiers = namedExportMatch[1].split(',').map(s => s.trim());
          exports.push({
            module: '', // Local export
            type: 'export',
            specifiers,
            line: index + 1,
            isDefault: false,
            isNamespace: false
          });
        }

        // Re-exports: export ... from '...'
        const reExportMatch = trimmed.match(/export\s+(.*?)\s+from\s+['"]([^'"]+)['"]/);
        if (reExportMatch) {
          const exportClause = reExportMatch[1];
          const module = reExportMatch[2];
          const specifiers: string[] = [];
          let isNamespace = false;

          if (exportClause.includes('{')) {
            const namedMatch = exportClause.match(/\{([^}]+)\}/);
            if (namedMatch) {
              specifiers.push(...namedMatch[1].split(',').map(s => s.trim()));
            }
          } else if (exportClause.includes('*')) {
            isNamespace = true;
            const asMatch = exportClause.match(/\*\s+as\s+(\w+)/);
            if (asMatch) {
              specifiers.push(asMatch[1]);
            }
          }

          exports.push({
            module,
            type: 'export',
            specifiers,
            line: index + 1,
            isDefault: false,
            isNamespace
          });
        }

        // Default exports: export default ...
        if (trimmed.startsWith('export default')) {
          const defaultMatch = trimmed.match(/export\s+default\s+(?:class\s+(\w+)|function\s+(\w+)|(\w+))/);
          const specifier = defaultMatch?.[1] || defaultMatch?.[2] || defaultMatch?.[3] || 'default';
          
          exports.push({
            module: '',
            type: 'export',
            specifiers: [specifier],
            line: index + 1,
            isDefault: true,
            isNamespace: false
          });
        }

        // Export declarations: export function, export class, etc.
        const declExportMatch = trimmed.match(/export\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)/);
        if (declExportMatch) {
          exports.push({
            module: '',
            type: 'export',
            specifiers: [declExportMatch[1]],
            line: index + 1,
            isDefault: false,
            isNamespace: false
          });
        }
      }
    });

    return exports;
  }

  /**
   * Extract detailed function information
   */
  private static async extractFunctions(content: string, language: Language): Promise<FunctionInfo[]> {
    const functions: FunctionInfo[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (language === Language.Rust) {
        const fnMatch = trimmed.match(/^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*\(([^)]*)\)/);
        if (fnMatch) {
          const name = fnMatch[1];
          const paramStr = fnMatch[2];
          const params = paramStr ? paramStr.split(',').map(p => p.trim().split(':')[0].trim()) : [];
          
          functions.push({
            name,
            line: index + 1,
            params,
            complexity: this.calculateFunctionComplexity(content, index),
            isAsync: trimmed.includes('async'),
            isExported: trimmed.startsWith('pub')
          });
        }
      }

      if (language === Language.TypeScript || language === Language.JavaScript || language === Language.Svelte) {
        // Function declarations
        const fnMatch = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
        if (fnMatch) {
          const name = fnMatch[1];
          const paramStr = fnMatch[2];
          const params = paramStr ? paramStr.split(',').map(p => p.trim().split(':')[0].trim()) : [];
          
          functions.push({
            name,
            line: index + 1,
            params,
            complexity: this.calculateFunctionComplexity(content, index),
            isAsync: trimmed.includes('async'),
            isExported: trimmed.startsWith('export')
          });
        }

        // Arrow functions
        const arrowMatch = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/);
        if (arrowMatch) {
          const name = arrowMatch[1];
          const paramStr = arrowMatch[2];
          const params = paramStr ? paramStr.split(',').map(p => p.trim().split(':')[0].trim()) : [];
          
          functions.push({
            name,
            line: index + 1,
            params,
            complexity: this.calculateFunctionComplexity(content, index),
            isAsync: trimmed.includes('async'),
            isExported: trimmed.startsWith('export')
          });
        }
      }
    });

    return functions;
  }

  /**
   * Extract detailed class information
   */
  private static async extractClasses(content: string, language: Language): Promise<ClassInfo[]> {
    const classes: ClassInfo[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      if (language === Language.TypeScript || language === Language.JavaScript || language === Language.Svelte) {
        const classMatch = trimmed.match(/^(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/);
        if (classMatch) {
          const name = classMatch[1];
          const extendsClass = classMatch[2];
          const implementsInterfaces = classMatch[3] ? classMatch[3].split(',').map(s => s.trim()) : [];
          
          // Extract methods and properties from class body
          const { methods, properties } = this.extractClassMembers(lines, i);
          
          classes.push({
            name,
            line: i + 1,
            methods,
            properties,
            isExported: trimmed.startsWith('export'),
            extends: extendsClass,
            implements: implementsInterfaces
          });
        }
      }
    }

    return classes;
  }

  /**
   * Extract class members (methods and properties)
   */
  private static extractClassMembers(lines: string[], startIndex: number): { methods: FunctionInfo[], properties: string[] } {
    const methods: FunctionInfo[] = [];
    const properties: string[] = [];
    let braceDepth = 0;
    let foundOpenBrace = false;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Track brace depth
      for (const char of line) {
        if (char === '{') {
          braceDepth++;
          foundOpenBrace = true;
        } else if (char === '}') {
          braceDepth--;
          if (braceDepth === 0 && foundOpenBrace) {
            return { methods, properties }; // End of class
          }
        }
      }

      if (foundOpenBrace && braceDepth === 1) {
        // Method definitions
        const methodMatch = trimmed.match(/^(?:public\s+|private\s+|protected\s+)?(?:async\s+)?(\w+)\s*\(([^)]*)\)/);
        if (methodMatch && !trimmed.includes('=') && !trimmed.startsWith('//')) {
          const name = methodMatch[1];
          const paramStr = methodMatch[2];
          const params = paramStr ? paramStr.split(',').map(p => p.trim().split(':')[0].trim()) : [];
          
          methods.push({
            name,
            line: i + 1,
            params,
            complexity: this.calculateFunctionComplexity(lines.join('\n'), i),
            isAsync: trimmed.includes('async'),
            isExported: false // Methods are part of class export
          });
        }

        // Property definitions
        const propMatch = trimmed.match(/^(?:public\s+|private\s+|protected\s+)?(\w+)(?:\s*:\s*\w+)?(?:\s*=|;)/);
        if (propMatch && !methodMatch && !trimmed.includes('(')) {
          properties.push(propMatch[1]);
        }
      }
    }

    return { methods, properties };
  }

  /**
   * Calculate complexity for a specific function
   */
  private static calculateFunctionComplexity(content: string, startLine: number): number {
    const lines = content.split('\n');
    let braceDepth = 0;
    let complexity = 1; // Base complexity
    let inFunction = false;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      
      // Track brace depth to stay within function
      for (const char of line) {
        if (char === '{') {
          braceDepth++;
          inFunction = true;
        } else if (char === '}') {
          braceDepth--;
          if (braceDepth === 0 && inFunction) {
            return complexity; // End of function
          }
        }
      }

      if (inFunction) {
        // Count complexity-adding constructs
        if (line.match(/\bif\b/)) complexity++;
        if (line.match(/\belse\b/)) complexity++;
        if (line.match(/\bwhile\b/)) complexity++;
        if (line.match(/\bfor\b/)) complexity++;
        if (line.match(/\bmatch\b/)) complexity++; // Rust
        if (line.match(/\bswitch\b/)) complexity++;
        if (line.match(/\bcase\b/)) complexity++;
        if (line.match(/\bcatch\b/)) complexity++;
        if (line.match(/\?\s*:/)) complexity++; // Ternary
        if (line.match(/&&/)) complexity++;
        if (line.match(/\|\|/)) complexity++;
      }
    }

    return complexity;
  }

  /**
   * Get file extension
   */
  private static getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.');
    return lastDot === -1 ? '' : filePath.substring(lastDot).toLowerCase();
  }
}