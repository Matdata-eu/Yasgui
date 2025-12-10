## How to generate release notes

Get the git commits since the last tag.

- Use the semantic git commits to bundle changes into 3 sections:
    - feat: commits go into 'New features' and are new elements that a user will exprience
    - fix: commits go into 'Fixes' are only related to user facing bug fixes of previously added features
    - chore: commits go into 'Chores' and are related to maintenance tasks and non-user facing changes
- Do not add any doc: or ci: commits to the release notes

Start each line with the word "Added", "Fixed" or "Updated" depending on the type of change.

Do not include references to the commits themselves. 

Fixes for features that were added during the time period, should not be included.

Write the output to a markdown file.