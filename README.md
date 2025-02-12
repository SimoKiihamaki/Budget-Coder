# Budget-Coder

Budget-Coder is an intelligent code analysis and editing pipeline that provides enterprise-grade code understanding and modification capabilities at a fraction of the cost. By leveraging the power of Deepseek Coder (a cost-effective alternative to GPT-4) combined with Claude Sonnet's precise editing, it delivers high-quality code analysis and modifications while maintaining comprehensive project context.

## Key Features

### 1. Cost-Effective Intelligence
- Uses Deepseek Coder for deep code analysis (significantly cheaper than GPT-4)
- Leverages Claude Sonnet for precise edits (better price-performance ratio)
- Optimizes token usage through smart context management
- Maintains high quality while reducing API costs

### 2. Smart Context Management
- Automatically extracts and manages relevant code context (50k-100k tokens)
- Preserves project knowledge and relationships
- Tracks dependencies and impact analysis
- Maintains comprehensive audit trail

### 3. Intelligent Pipeline
- **Analysis Phase (Deepseek Coder)**
  - Deep code structure understanding
  - Pattern recognition
  - Improvement suggestions
  - Dependency analysis
  
- **Edit Phase (Claude Sonnet)**
  - Precise code modifications
  - Context-aware changes
  - Documentation updates
  - Test considerations

### 4. Enterprise Features
- Comprehensive audit logging
- Error recovery mechanisms
- Rate limit management
- Token usage optimization

## Getting Started

### Prerequisites
- Node.js 18 or higher
- OpenRouter API key (for Deepseek and Claude access)
- MCP-compatible environment

### Installation
1. Clone the repository:
```bash
git clone https://github.com/SimoKiihamaki/Budget-Coder.git
cd Budget-Coder
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your OpenRouter API key
```

4. Build the project:
```bash
npm run build
```

### MCP Integration
Add to your MCP settings (typically in cline_mcp_settings.json):
```json
{
  "mcpServers": {
    "code-pipeline": {
      "command": "node",
      "args": ["path/to/Budget-Coder/build/index.js"],
      "env": {
        "OPENROUTER_API_KEY": "your-api-key"
      },
      "disabled": false,
      "autoApprove": [],
      "alwaysAllow": []
    }
  }
}
```

## Usage

### 1. Code Analysis
```typescript
await use_mcp_tool({
  server_name: "code-pipeline",
  tool_name: "analyze_code",
  arguments: {
    context: "your code here",
    task: "describe what to analyze"
  }
});
```

### 2. Code Modifications
```typescript
await use_mcp_tool({
  server_name: "code-pipeline",
  tool_name: "generate_edits",
  arguments: {
    context: "original code",
    analysis: "analysis from previous step"
  }
});
```

## Cost Benefits

### Token Optimization
- Smart context extraction reduces token usage
- Efficient model selection based on task
- Caching and reuse of analysis results
- Automatic token limit management

### Price Comparison
| Model | Cost per 1M tokens | Our Usage |
|-------|-------------------|------------|
| GPT-4 | $30.00           | N/A        |
| Deepseek | $0.50         | Analysis   |
| Claude Sonnet | $3.00    | Editing    |

Average cost reduction: 80-90% compared to GPT-4 based solutions

## Features

### Intelligent Analysis
- Deep code understanding
- Pattern recognition
- Security analysis
- Performance optimization
- Best practice enforcement

### Precise Editing
- Context-aware modifications
- Style preservation
- Documentation updates
- Test considerations
- Error prevention

### Enterprise Ready
- Comprehensive logging
- Audit trails
- Error recovery
- Rate limiting
- Token optimization

## Architecture

```mermaid
graph TD
    Input[Code Input] --> Context[Context Manager]
    Context --> Analysis[Deepseek Analysis]
    Analysis --> Validation[Context Validation]
    Validation --> Edits[Claude Editing]
    Edits --> Audit[Audit Logger]
    Audit --> Output[Final Code]
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Deepseek Coder team for their excellent model
- Anthropic for Claude Sonnet
- OpenRouter for API access
- MCP community for the framework

Remember: Budget-Coder provides enterprise-grade code analysis and editing capabilities while significantly reducing costs through smart model selection and efficient token management.
