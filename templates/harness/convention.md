# Conventions

> Extreme homogeneity. AI predicts better when the repository looks like itself everywhere.

## TypeScript Style
- Server version     : typescript ^6.0.3
- Backoffice version : typescript ~6.0.2
- Templates/* version: Using Vanila JavaScript
- Format             : PEP 8. 100 characters maximum per line
- Strings            : use double quote over single quote

## Naming

| TYPE             | Convention  | Example               |
|------------------|-------------|-----------------------|
|Module            | lowercase   | server                |
|Class             | PascalCase  | MyClass               |
|Function/variable | camelCase   | myFunction            |
|Constant          | UPPER_SNAKE | DEFAULT_SOMETHING_PATH|
|Private           | camelCase   | private myFunction    |
|------------------|-------------|-----------------------|

## File Structure
Each file should start with:
1. One-line comment that describes the purpose of the file
2. imports from external libs or dependencies
3. imports from the own project
4. implementation

## Tests

- Only one test file per normal file maximum.
- Only one class per logical unit. `Test<thing>(unittest.TestCase)`.
- Descriptive test names: `testLoadReturnsEmptyWhenFileMissing`

## Error Handling

The CLI must capture domain exceptions, print the error to stderr and exit with 1 code. It should NEVER show stack traces to end-user. 

