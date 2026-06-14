# Building Smart Hostel Grievance: Problems Faced And How I Solved Them

Smart Hostel Grievance looks simple from the outside: students submit hostel complaints, and admins resolve them. But while building it from scratch, I realized that the real challenge was not just creating forms and dashboards. The difficult part was turning scattered student complaints into something hostel staff could actually act on every day.

This blog documents the main problems I faced while building the project, the errors that came up during development, and how I solved them.

## 1. The First Problem: A Complaint Form Alone Was Not Enough

The initial idea was straightforward: let students submit complaints and let admins see them.

But thinking from the user's perspective showed a bigger issue.

Students do not want to fill a complicated form. They just want to say:

> Water is not coming in BH-2 washroom.

Admins, on the other hand, do not want a long list of repeated complaints. They want to know:

- Which hostel needs attention?
- How many students are affected?
- Is this urgent?
- Has this already been reported?
- What should be handled first?

So I changed the product direction from a simple complaint form to a complaint management platform.

The final system supports:

- Student complaint submission
- English and Hinglish input
- Hostel and exact location details
- Impact scope
- Complaint grouping
- Admin priority dashboard
- Status updates
- Complaint history

This made the project more useful because it solved the actual workflow, not just the data entry part.

## 2. Designing The Backend Without Turning It Into A Monolith

A common mistake in student projects is putting everything inside one large `main.py` file. That works for a demo, but it becomes hard to test, debug, and extend.

I faced this early while planning the backend. Authentication, complaints, admin dashboards, classification, and database access all had different responsibilities. If I mixed them together, every small change would become risky.

I solved this by separating the backend into layers:

- API routes handle HTTP requests.
- Services contain business logic.
- Repositories handle database queries.
- Schemas define request and response data.
- Models define database tables.
- Core modules handle config and security.

This structure made the project easier to grow. For example, I could improve complaint grouping without touching authentication routes.

## 3. Authentication Needed To Be Simple For Users But Secure Internally

The project needed two types of users:

- Students
- Admins

At first, it was tempting to keep authentication basic. But for a production-style project, login cannot be treated casually.

The challenges were:

- Passwords should never be stored directly.
- Students and admins should see different screens.
- Admin pages should not be accessible to students.
- The frontend should not manually store sensitive tokens in local storage.

I solved this by adding:

- Hashed passwords
- Role-based access
- HTTP-only auth cookies
- Protected frontend routes
- Backend permission checks

This gave the app a more realistic security model while keeping the login experience simple for users.

## 4. The `ModuleNotFoundError: No module named 'app'` Problem

While testing the admin creation script, I hit this error:

```text
ModuleNotFoundError: No module named 'app'
```

This happened because Python could not find the backend package when running the script from the wrong context or without the project root on the import path.

The fix was to make scripts project-root friendly and ensure they could import backend modules correctly. The script now works from the repository root, where the `app/` package is available.

This was a useful reminder that helper scripts should be easy to run for someone setting up the project for the first time.

## 5. The `no such table: users` Problem

After fixing the import issue, the next error was:

```text
sqlite3.OperationalError: no such table: users
```

This happened because the database file existed, but the tables had not been created yet.

In production, database schema should come from migrations. But for local development, it should also be easy to start quickly.

I solved this by supporting both:

- Alembic migrations for production-style database setup
- Auto table creation for local SQLite development when enabled

This made the app easier to run on a laptop while still keeping a proper migration path for deployment.

## 6. SQLite For Local Development, PostgreSQL For Deployment

Another challenge was database choice.

SQLite is easy for local development, but PostgreSQL is better for deployment and production-style work. The project needed to support both without making the code messy.

The main problems were:

- SQLite is convenient but limited.
- PostgreSQL needs proper connection strings.
- Deployment services like Neon require SSL parameters.
- Some production features should not break local development.

I solved this with environment-based configuration.

For local development:

```text
DATABASE_URL=sqlite:///./data/dev.db
```

For deployment:

```text
postgresql+psycopg://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

This allowed the same application code to run locally and on Render with Neon PostgreSQL.

## 7. Complaint Grouping Was Harder Than It Looked

If five students complain about the same water issue, admins should not see five separate problems. They should see one problem with five reports attached.

The challenge was deciding when two complaints should be grouped.

I did not want the system to group unrelated complaints just because they used similar words. For example:

- "No water in BH-2 washroom"
- "Dirty water in BH-2 cooler"

Both are water-related, but they may require different action.

I solved this by grouping complaints using practical boundaries:

- Same hostel
- Same category
- Similar complaint meaning
- Open issue status

If the system is confident enough, it attaches the complaint to an existing issue. Otherwise, it creates a new issue.

This made the admin dashboard cleaner and more realistic.

## 8. The Embedding Model Could Be Unavailable

The project supports semantic matching, but local ML models can fail for several reasons:

- The model is not downloaded.
- The server has low memory.
- Free hosting has limited resources.
- The container starts slowly.

At one point, the app showed:

```text
Embedding model is unavailable; semantic duplicate matching was skipped.
```

This was intentional after improving the system. Instead of silently using fake zero vectors, the app clearly reports that semantic matching was skipped.

The important decision was: fail safely.

If the model is unavailable, the app still:

- Saves the complaint
- Classifies basic category and urgency
- Creates or links issues using safer fallback logic
- Warns that semantic matching was skipped

This is better than pretending the AI worked when it did not.

## 9. English And Hinglish Input Needed Special Handling

Students may not write formal English complaints. They may write things like:

```text
Paani nahi aa raha in BH-3 washroom since morning
```

If the system only expected polished English, it would fail for real hostel usage.

I added normalization for common Hinglish words and phrases. For example:

- `paani` maps toward water-related complaints
- `bijli` maps toward electricity-related complaints
- mixed English/Hindi sentences are handled without forcing students to translate

This made the student experience more natural.

## 10. Time Display Was Confusing

During testing, the history timestamps looked wrong.

The issue was not that the database had random values. The problem was how time was stored and displayed across backend, frontend, and browser locale.

The fix was to keep backend timestamps consistent and format them on the frontend for the user's local timezone.

This made complaint history easier to understand, especially for recent updates.

## 11. The Admin Dashboard Initially Looked Too Technical

The first admin UI had terms like:

- SLA
- Risk scoring
- Evidence density
- Operational signals
- Classifier

These terms may sound impressive, but they are not what real hostel users care about.

Admins want simple language:

- What is new?
- What is late?
- What is being fixed?
- Which hostel needs attention?
- What should I do next?

So I replaced technical labels with user-friendly wording:

- `SLA` became `Time`
- `OPEN` became `New`
- `IN_PROGRESS` became `Being fixed`
- `Complaint evidence` became `Student reports`
- `Risk scoring` became `Priority`

The backend can still be technical. The UI should not force users to think like engineers.

## 12. The UI Looked Too Much Like A Generic AI Dashboard

Another major problem was visual design.

The first dark UI looked polished, but it had the same problem many AI-generated dashboards have:

- Too many glowing effects
- Too much decorative styling
- Big hero sections
- Technical-looking labels
- Not enough focus on the actual work

From an admin's perspective, the issue queue is the product. It should not be hidden below decorative cards.

I redesigned the UI around real usage:

- Admin queue moved higher on the page
- Filters became immediately visible
- Cards became more restrained
- Colors were used for meaning, not decoration
- Student screens became calmer and simpler

The final UI feels more like a practical help desk than a futuristic template.

## 13. Removing Mock Data Was Important

Mock dashboards can look good, but they do not prove that the product works.

I made sure the frontend uses real API data instead of fake generated complaints. That means:

- Student complaints are saved through the backend.
- Admin dashboard reads real database records.
- Issue details show actual linked complaints.
- Status updates are persisted.

This made the project stronger because the UI and backend are connected end to end.

## 14. Local Development Had Port Conflicts

While testing locally, ports were already occupied by other tools.

For example:

- Port `8000` was already used by Docker or WSL.
- Port `3000` was already used by another frontend.

This caused confusing behavior where the browser opened a page, but it was not always the correct app.

I solved this by making the frontend proxy configurable:

```text
VITE_API_PROXY_TARGET=http://127.0.0.1:8010
```

Now the backend can run on another port, and the frontend can still connect correctly.

This is a small change, but it makes demos much safer.

## 15. PowerShell Environment Variables Were Tricky

On Windows, setting environment variables inside nested commands caused quoting problems.

For example, JSON-like values for CORS origins created PowerShell parsing errors.

I solved this by:

- Supporting comma-separated CORS values
- Using simpler environment values during local testing
- Avoiding fragile shell quoting where possible

This made the project easier to run on Windows laptops.

## 16. GitHub Push Failed With SSH Keys

While pushing the project, GitHub rejected the SSH connection:

```text
Permission denied (publickey)
```

The reason was that the machine did not have the correct SSH key configured for GitHub.

The fix was to push using a GitHub remote that worked with the available credentials. After that, commits could be pushed normally.

This was an important deployment lesson: the code may be ready, but the delivery path also needs to be tested.

## 17. Free Deployment Needed Practical Tradeoffs

The goal was to deploy the project for free.

Free hosting is useful, but it has limitations:

- Apps may sleep after inactivity.
- Memory is limited.
- ML models may be too heavy.
- Database connections need correct SSL settings.
- Startup time matters.

I used:

- Render for hosting
- Neon for PostgreSQL
- A single service that serves both FastAPI and the built React app

To keep it reliable on free infrastructure, I kept heavy transformer embeddings optional and made the app work even when the model is disabled.

## 18. Making The README Useful

At first, the README had too much technical and resume-style content.

That was not ideal because a README should help someone quickly understand:

- What the project does
- How to try it
- How to run it locally
- What the main workflows are
- What tech stack was used

I cleaned it up by adding:

- Live demo link
- Demo credentials
- Screenshots
- Student/admin workflow explanation
- Setup instructions
- Deployment notes

I removed resume bullets from the README because those belong in the resume, not the project documentation.

## 19. Testing Caught Small But Important Issues

Automated checks helped catch problems after UI copy changes.

For example, after changing "Submit a grievance" to simpler wording, one frontend test still expected the old text. Updating the test ensured the UI and tests stayed aligned.

The project uses:

- Backend tests for complaint classification, authentication, and complaint grouping
- Frontend tests for student form rendering
- Lint checks
- Production build checks

These checks helped prevent small changes from breaking the app.

## 20. The Biggest Lesson

The biggest lesson from this project was that production readiness is not just about adding Docker, authentication, and database migrations.

A project becomes stronger when it works well for its actual users.

For students, that means:

- Simple language
- Fast complaint submission
- Clear status tracking
- No unnecessary technical details

For admins, that means:

- Problems sorted by importance
- Similar complaints grouped together
- Clear filters
- Student reports in one place
- Simple update flow

For developers, that means:

- Clean backend structure
- Reliable configuration
- Tests
- Deployment documentation
- Safe fallback behavior

## Conclusion

Smart Hostel Grievance started as a hostel complaint idea, but building it properly required solving real product and engineering problems.

The hardest parts were not the obvious ones. The hardest parts were making the system reliable, understandable, and useful:

- Handling local setup errors
- Making database setup predictable
- Supporting English and Hinglish complaints
- Grouping related complaints safely
- Avoiding fake AI behavior
- Making the admin dashboard practical
- Keeping the UI language simple
- Deploying on free infrastructure

This project taught me that a good full-stack application is not just a working backend and a nice frontend. It is a complete workflow that helps real users get their work done with less confusion.
