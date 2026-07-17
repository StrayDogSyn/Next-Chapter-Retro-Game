# Next Chapter Admissions Project Pre-Submission Audit Report

Source: Section 9, Parts 1 through 11
Purpose: Provide a complete, AI-ready audit rubric for final project review before submission.

## How To Use This Report In VS Code

Copy this report and ask your AI assistant:

Audit my project against this report. Produce:
1. A pass or fail result for every required item.
2. Exact missing items.
3. File-specific fixes with line-level recommendations.
4. A prioritized action plan from highest risk to lowest risk.
5. A final readiness verdict: Ready to Submit or Not Ready.

Also include a strict evidence table with:
- Requirement
- Status (Pass, Fail, Partial)
- Evidence (file path, section, or observed behavior)
- Fix needed

Do not assume completion. Verify everything from repository files and deployed behavior.

## Part 1 Mission Brief

Goal: Build a small web application that demonstrates ability to:
- Solve a problem
- Create value
- Work effectively with AI

Core reviewer question:
Can you effectively work with AI to build software?

Scope guidance:
- Small enough to finish
- Interesting and easy to explain
- Valuable to another person
- Engineering habits matter more than project size

## Part 2 Define The Value

Core question:
Why would someone use this?

Everything in the project should map back to this value statement.

## Part 3 Planning Requirements

A planning artifact should define:
1. Problem: Who has this problem?
2. Value: What benefit does the project provide?
3. Smallest demonstration of value: Minimum version that proves usefulness
4. Required features: Necessary to deliver value
5. Stretch features: Nice-to-have if time permits

Audit expectation:
- Value-first prioritization is visible in implementation decisions

## Part 4 AI Usage Requirement

AI must be used throughout the project.
The tool itself is not graded. The workflow and decisions are.

Evidence should show:
- Planning with AI
- Iterative prompting
- Debugging support
- Clarifying questions
- Verification and challenge of AI outputs where needed

## Part 5 Technical Requirements

Submission must include:
- Working web application
- HTML
- CSS
- JavaScript

Application must clearly demonstrate stated value.

Not required:
- User accounts
- Database
- External API
- React
- AI runtime features
- Hosting beyond GitHub Pages

## Part 6 GitHub Repository Requirements

Repository must be public and include:
- Source code
- README
- Prompt history file
- Commit history

Commit quality expectation:
- Multiple meaningful commits
- Not one single end-of-project commit

Good commit message style examples:
- Create homepage
- Add habit form
- Display habits
- Fix validation bug
- Improve layout

## Part 7 GitHub Pages Deployment Requirements

Must provide a working live deployment via GitHub Pages.

Required checks:
- index.html exists as main entry
- CSS and JS are correctly linked
- Live link opens and app works
- No secrets or sensitive data exposed

Deployment configuration expected:
- Source: Deploy from a branch
- Branch: main
- Folder: root

README should include a Live Demo section with the deployment link.

## Part 8 README Requirements

README must include all of the following:
- Project Name
- Live Demo
- Problem
- Value
- Project Plan
- Features (completed and next)
- Technologies Used
- AI Tools Used
- Running the Project

Audit expectation:
- Sections are present, clear, and consistent with actual implementation

## Part 9 Prompt History Requirements

Repository must include one file named:
- prompt-history.md, or
- prompts.md

Should include representative prompts, not necessarily every prompt.

Best evidence categories:
- Planning
- Feature implementation
- Debugging
- Follow-up questioning
- Code explanation requests
- Verification prompts

Evaluator focus:
- Evidence of collaboration quality with AI
- Iteration and reasoning

## Part 10 Resource Note

Resource links are informational.
Audit focus remains on project artifact quality and requirement compliance.

## Part 11 Final Submission Checklist

Use this strict checklist:
- Public GitHub repository
- Working GitHub Pages link
- Working application
- README with all required sections
- README includes live demo link
- Prompt history file included
- Multiple meaningful commits
- Clear project structure
- Features demonstrate value
- Code is explainable by author

## Interview Readiness Questions

Project owner should be able to answer:
1. What problem is solved and what value is created?
2. Why this solution and build order?
3. How AI was used and where AI was challenged?
4. Most interesting bug and resolution approach?
5. How correctness was verified?
6. What would be improved with more time?
7. What part of project is strongest and why?

## AI Audit Output Format To Require

When running this report through VS Code AI, require this output shape:

A. Executive Summary
- Overall readiness verdict
- Top 3 blockers
- Top 3 strengths

B. Requirement Matrix
- Every requirement from Parts 1 through 11
- Status: Pass, Partial, Fail
- Evidence and file references
- Fix recommendation

C. Risk Review
- Submission rejection risks
- Missing artifact risks
- Functionality or deployment risks

D. Action Plan
- Ordered by priority
- Fastest path to Ready to Submit
- Exact files to edit

E. Final Gate
- Ready to Submit or Not Ready
- If not ready, list exact must-fix items

## Optional Strict Prompt You Can Paste Into VS Code AI

Use this exactly if desired:

Audit this repository against the Next Chapter Section 9 Pre-Submission Audit Report. Perform a strict evidence-based audit only from actual repository files, commit history, and deployment behavior. Do not infer completion without proof. Return:
1. Executive summary with final readiness verdict.
2. Full requirement matrix with Pass, Partial, Fail for every requirement.
3. Evidence for each row.
4. Exact missing items and exact fixes.
5. Prioritized action plan.
6. Final gate decision: Ready to Submit or Not Ready.

If any required item is missing, include copy-ready text or file content templates to resolve it.
