// Code analyzer for PHP/Laravel code
class CodeAnalyzer {
    constructor() {
        this.routePatterns = {
            apiResource: /Route::apiResource\(['"]([^'"]+)['"]\s*,\s*([^)]+)\)/g,
            get: /Route::get\(['"]([^'"]+)['"]\s*,\s*(?:\[([^,\]]+).*?['"](\\w+)['"]\]|['"]([^'"]+)['"])\)/g,
            post: /Route::post\(['"]([^'"]+)['"]\s*,\s*(?:\[([^,\]]+).*?['"](\\w+)['"]\]|['"]([^'"]+)['"])\)/g,
            put: /Route::put\(['"]([^'"]+)['"]\s*,\s*(?:\[([^,\]]+).*?['"](\\w+)['"]\]|['"]([^'"]+)['"])\)/g,
            delete: /Route::delete\(['"]([^'"]+)['"]\s*,\s*(?:\[([^,\]]+).*?['"](\\w+)['"]\]|['"]([^'"]+)['"])\)/g,
            patch: /Route::patch\(['"]([^'"]+)['"]\s*,\s*(?:\[([^,\]]+).*?['"](\\w+)['"]\]|['"]([^'"]+)['"])\)/g,
        };
        
        this.validationPatterns = {
            rules: /public\s+function\s+rules\(\)[^{]*{([^}]+)}/,
            ruleArray: /['"](\\w+)['"]\s*=>\s*\[([^\]]+)\]|['"](\\w+)['"]\s*=>\s*['"]([^'"]+)['"]/g,
        };
    }
    
    analyzeRoutes(code) {
        const routes = [];
        const prefix = this.extractPrefix(code);
        
        // Analyze apiResource routes
        let match;
        const apiResourcePattern = new RegExp(this.routePatterns.apiResource);
        while ((match = apiResourcePattern.exec(code)) !== null) {
            const resource = match[1];
            const controller = match[2].trim().replace(/['"]/g, '').split('::')[0];
            const baseUri = prefix ? `${prefix}/${resource}` : resource;
            
            // apiResource creates standard REST routes
            routes.push(
                { method: 'GET', uri: baseUri, controller, action: 'index' },
                { method: 'POST', uri: baseUri, controller, action: 'store' },
                { method: 'GET', uri: `${baseUri}/{${this.singularize(resource)}}`, controller, action: 'show' },
                { method: 'PUT', uri: `${baseUri}/{${this.singularize(resource)}}`, controller, action: 'update' },
                { method: 'DELETE', uri: `${baseUri}/{${this.singularize(resource)}}`, controller, action: 'destroy' }
            );
        }
        
        // Analyze individual routes
        ['get', 'post', 'put', 'delete', 'patch'].forEach(method => {
            const pattern = new RegExp(this.routePatterns[method]);
            let match;
            while ((match = pattern.exec(code)) !== null) {
                const uri = match[1];
                const controller = match[2] || match[4];
                const action = match[3] || 'handle';
                const fullUri = prefix ? `${prefix}/${uri}` : uri;
                
                routes.push({
                    method: method.toUpperCase(),
                    uri: fullUri,
                    controller: controller ? controller.trim().replace(/['"]/g, '').split('::')[0] : 'Closure',
                    action: action
                });
            }
        });
        
        return routes;
    }
    
    analyzeValidationRules(code) {
        const rules = {};
        const rulesMatch = code.match(this.validationPatterns.rules);
        
        if (rulesMatch) {
            const rulesContent = rulesMatch[1];
            let match;
            
            while ((match = this.validationPatterns.ruleArray.exec(rulesContent)) !== null) {
                const field = match[1] || match[3];
                const ruleArray = match[2];
                const ruleString = match[4];
                
                if (field) {
                    if (ruleArray) {
                        // Parse array format ['required', 'string', ...]
                        rules[field] = ruleArray
                            .split(',')
                            .map(r => r.trim().replace(/['"]/g, ''))
                            .filter(r => r);
                    } else if (ruleString) {
                        // Parse string format 'required|string|...'
                        rules[field] = ruleString.split('|').map(r => r.trim());
                    }
                }
            }
        }
        
        return rules;
    }
    
    analyzeResource(code) {
        const fields = [];
        const arrayPattern = /return\s*\[([^\]]+)\]/;
        const match = code.match(arrayPattern);
        
        if (match) {
            const content = match[1];
            const fieldPattern = /['"](\\w+)['"]\s*=>\s*\$this->(\\w+)/g;
            let fieldMatch;
            
            while ((fieldMatch = fieldPattern.exec(content)) !== null) {
                fields.push({
                    name: fieldMatch[1],
                    source: fieldMatch[2]
                });
            }
        }
        
        return fields;
    }
    
    extractPrefix(code) {
        const prefixMatch = code.match(/Route::prefix\(['"]([^'"]+)['"]\)/);
        return prefixMatch ? prefixMatch[1] : '';
    }
    
    singularize(word) {
        // Simple singularization
        if (word.endsWith('ies')) {
            return word.slice(0, -3) + 'y';
        } else if (word.endsWith('es')) {
            return word.slice(0, -2);
        } else if (word.endsWith('s')) {
            return word.slice(0, -1);
        }
        return word;
    }
    
    generateOpenApiPreview(routes, validationRules = {}) {
        const paths = {};
        
        routes.forEach(route => {
            const path = route.uri.replace(/\{(\\w+)\}/g, '{$1}');
            if (!paths[path]) {
                paths[path] = {};
            }
            
            const operation = {
                summary: `${route.action} ${route.controller}`,
                tags: [this.extractTag(route.uri)],
                responses: {
                    '200': {
                        description: 'Successful response',
                        content: {
                            'application/json': {
                                schema: { type: 'object' }
                            }
                        }
                    }
                }
            };
            
            // Add parameters for path variables
            const pathParams = [...route.uri.matchAll(/\{(\\w+)\}/g)];
            if (pathParams.length > 0) {
                operation.parameters = pathParams.map(param => ({
                    name: param[1],
                    in: 'path',
                    required: true,
                    schema: { type: 'string' }
                }));
            }
            
            // Add request body for POST/PUT/PATCH
            if (['POST', 'PUT', 'PATCH'].includes(route.method) && Object.keys(validationRules).length > 0) {
                operation.requestBody = {
                    required: true,
                    content: {
                        'application/json': {
                            schema: this.generateSchemaFromRules(validationRules)
                        }
                    }
                };
            }
            
            paths[path][route.method.toLowerCase()] = operation;
        });
        
        return {
            openapi: '3.0.0',
            info: {
                title: 'Laravel API',
                version: '1.0.0',
                description: 'API documentation generated by Laravel Spectrum'
            },
            servers: [
                {
                    url: 'http://localhost:8000',
                    description: 'Local development server'
                }
            ],
            paths: paths
        };
    }
    
    generateSchemaFromRules(rules) {
        const properties = {};
        const required = [];
        
        Object.entries(rules).forEach(([field, fieldRules]) => {
            const property = { type: 'string' };
            
            fieldRules.forEach(rule => {
                if (rule === 'required') {
                    required.push(field);
                } else if (rule === 'integer' || rule.startsWith('min:') || rule.startsWith('max:')) {
                    property.type = 'integer';
                } else if (rule === 'boolean') {
                    property.type = 'boolean';
                } else if (rule === 'email') {
                    property.format = 'email';
                } else if (rule.startsWith('max:')) {
                    property.maxLength = parseInt(rule.split(':')[1]);
                } else if (rule.startsWith('min:')) {
                    if (property.type === 'integer') {
                        property.minimum = parseInt(rule.split(':')[1]);
                    } else {
                        property.minLength = parseInt(rule.split(':')[1]);
                    }
                }
            });
            
            properties[field] = property;
        });
        
        return {
            type: 'object',
            properties: properties,
            required: required
        };
    }
    
    extractTag(uri) {
        const parts = uri.split('/').filter(p => p && !p.startsWith('{'));
        const relevantPart = parts.find(p => p !== 'api' && p !== 'v1' && p !== 'v2');
        return relevantPart ? relevantPart.charAt(0).toUpperCase() + relevantPart.slice(1) : 'Default';
    }
}

// Export for use in other files
window.CodeAnalyzer = CodeAnalyzer;