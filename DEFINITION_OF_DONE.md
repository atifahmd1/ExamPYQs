# Definition of Done

A feature is NOT considered complete merely because the code compiles.

A feature is complete when:

## Functionality

- Main flow works
- Edge cases considered
- Error states handled
- Loading states handled
- Empty states handled

## UI

- Mobile tested
- Tablet tested
- Desktop tested
- No overflow
- No broken layouts
- Touch targets are usable
- Keyboard navigation works where applicable

## Data

- Correct database constraints
- Correct indexes
- Correct relationships
- Validation exists
- No accidental data duplication

## Security

- Authentication checked
- Authorization checked
- RLS checked where applicable
- No secret exposed
- User input validated

## Performance

- No unnecessary queries
- No unnecessary data fetching
- Pagination used where appropriate
- No obvious performance bottleneck

## Testing

- Relevant unit tests
- Relevant integration tests
- Relevant E2E tests

## Production

- Error handling exists
- Logging exists where useful
- Environment variables configured
- Build succeeds
- No console errors

## Documentation

- Important architectural decisions documented
- Database changes documented
- Setup instructions updated