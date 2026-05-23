```markdown
# EM-DataSystem Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the EM-DataSystem repository, a TypeScript codebase with no detected framework. It covers file naming, import/export styles, commit message habits, and testing approaches. This guide helps contributors quickly align with the project's established practices.

## Coding Conventions

### File Naming
- **Convention:** PascalCase is used for file names.
- **Example:**  
  ```
  DataProcessor.ts
  UserModel.ts
  ```

### Import Style
- **Convention:** Use relative imports for referencing other files or modules within the project.
- **Example:**
  ```typescript
  import { DataProcessor } from './DataProcessor';
  import { UserModel } from '../models/UserModel';
  ```

### Export Style
- **Convention:** Mixed export styles are used (both named and default exports).
- **Examples:**
  ```typescript
  // Named export
  export function processData(data: any) { ... }

  // Default export
  export default class UserModel { ... }
  ```

### Commit Messages
- **Pattern:** Freeform messages, sometimes with prefixes, averaging 55 characters.
- **Example:**  
  ```
  Add initial data processing logic
  Fix bug in UserModel validation
  ```

## Workflows

### Adding a New Module
**Trigger:** When creating a new feature or logical unit.
**Command:** `/add-module`

1. Create a new file using PascalCase (e.g., `NewFeature.ts`).
2. Implement the module logic.
3. Use relative imports to include dependencies.
4. Export the main functionality (named or default as appropriate).
5. Add or update corresponding test files (`NewFeature.test.ts`).
6. Commit changes with a clear, descriptive message.

### Updating an Existing Module
**Trigger:** When modifying or enhancing an existing module.
**Command:** `/update-module`

1. Locate the target file (e.g., `DataProcessor.ts`).
2. Make necessary code changes.
3. Update or add tests in the corresponding `*.test.ts` file.
4. Ensure all imports remain relative.
5. Commit with a descriptive message summarizing the change.

### Writing and Running Tests
**Trigger:** When adding or modifying functionality.
**Command:** `/run-tests`

1. Create or update a test file matching the pattern `*.test.ts`.
2. Write tests covering new or changed logic.
3. Run the test suite using the project's test runner (framework unknown; consult project docs or package.json).
4. Fix any failing tests before committing.

## Testing Patterns

- **Test File Pattern:** Test files are named with the `*.test.*` pattern (e.g., `DataProcessor.test.ts`).
- **Framework:** Not explicitly detected; check project documentation for specifics.
- **Example:**
  ```typescript
  import { processData } from './DataProcessor';

  test('should process data correctly', () => {
    const result = processData([1, 2, 3]);
    expect(result).toEqual([2, 3, 4]);
  });
  ```

## Commands
| Command         | Purpose                                      |
|-----------------|----------------------------------------------|
| /add-module     | Scaffold and add a new module                |
| /update-module  | Update an existing module                    |
| /run-tests      | Run the test suite for the project           |
```
