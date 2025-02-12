# Budget-Coder

## Context-Aware Code Editing Mode

## Overview

This mode extends Roo's capabilities with intelligent, context-aware code editing through a specialized pipeline that combines Deepseek's analytical capabilities with Claude's precise editing. The mode maintains comprehensive project context while managing code edits through a multi-step process.

## Core Capabilities

### 1. Context Management
- Continuously tracks and updates project context
- Maintains documentation and memory state
- Automatically extracts relevant code segments (50k-100k tokens)
- Preserves relationships between dependent files

### 2. Intelligent Code Pipeline
- **Analysis Phase (Deepseek R1)**
  - Deep code structure analysis
  - Pattern recognition
  - Improvement suggestions
  - Dependency analysis
  
- **Edit Phase (Claude Sonnet)**
  - Precise code modifications
  - Context-aware changes
  - Documentation updates
  - Test considerations

### 3. Audit System
- Comprehensive operation logging
- Change tracking
- Decision documentation
- Error recovery

## Usage Patterns

### 1. Code Analysis
```
Analyze this code for potential improvements:
[paste code or provide file paths]
```
The mode will:
1. Extract relevant context
2. Send to Deepseek for analysis
3. Present findings and suggestions

### 2. Code Modifications
```
Refactor this code to [description]:
[paste code or provide file paths]
```
The mode will:
1. Analyze current implementation
2. Generate improvement plan
3. Execute precise edits
4. Update documentation

### 3. Context Updates
```
Update context for [file/component]:
[provide new information]
```
The mode will:
1. Integrate new information
2. Update documentation
3. Adjust related components

## Best Practices

1. **Context Scope**
   - Provide file paths for related code
   - Mention relevant dependencies
   - Describe the intended changes

2. **Task Description**
   - Be specific about desired outcomes
   - Mention performance/maintainability requirements
   - Indicate any constraints

3. **Documentation**
   - Let the mode update docs automatically
   - Review generated documentation
   - Verify context updates

## Working with the Pipeline

### Analysis Phase
The mode uses Deepseek R1 to:
- Understand code structure
- Identify patterns
- Suggest improvements
- Consider edge cases

### Edit Phase
Claude Sonnet then:
- Implements suggested changes
- Maintains code style
- Updates documentation
- Ensures consistency

## Error Handling

The mode automatically:
- Tracks operation status
- Maintains audit logs
- Recovers from failures
- Preserves context on errors

## Examples

### 1. Code Analysis
```
Analyze the authentication flow in src/auth/*.ts for security improvements
```

### 2. Refactoring
```
Refactor the data fetching logic in src/api/client.ts to use the new API endpoints
```

### 3. Feature Addition
```
Add input validation to the user registration form in src/components/Register.tsx
```

## Memory Management

The mode maintains:
1. **Active Context**
   - Current file contents
   - Related dependencies
   - Recent changes
   - Pending updates

2. **Project Memory**
   - Architecture decisions
   - Code patterns
   - Known issues
   - Documentation state

3. **Audit Trail**
   - Operation history
   - Change justifications
   - Error records
   - Context updates

## Integration with Other Modes

This mode works seamlessly with:
- **Architect Mode**: For high-level design decisions
- **Ask Mode**: For clarifying technical questions
- **Standard Code Mode**: For simple edits

## Limitations

1. **Token Limits**
   - Maximum context: ~100k tokens
   - May need to chunk large codebases
   - Prioritizes relevant context

2. **API Constraints**
   - Subject to rate limits
   - May have latency
   - Requires valid API keys

3. **Context Scope**
   - Limited to provided files
   - May miss external dependencies
   - Requires explicit updates

## Tips for Optimal Use

1. **Provide Context**
   - Include relevant file paths
   - Mention related components
   - Describe dependencies

2. **Clear Objectives**
   - Specify desired outcomes
   - Mention constraints
   - Indicate priorities

3. **Review Changes**
   - Check generated docs
   - Verify context updates
   - Test modifications

## Maintenance

The mode automatically:
1. Updates documentation
2. Maintains audit logs
3. Manages context
4. Handles errors

Remember: This mode excels at understanding and modifying code while maintaining project context. Use it for complex changes that require deep understanding of the codebase.
