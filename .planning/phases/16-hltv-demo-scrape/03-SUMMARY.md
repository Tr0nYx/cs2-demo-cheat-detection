---
phase: "16"
plan: "03"
subsystem: "Symfony Trigger & Background Cron"
tags: ["messenger", "cron", "symfony"]
requirements-completed: ["HLTV-01", "HLTV-02", "HLTV-05"]
key-files.created:
  - symfony/src/Application/Demo/HltvImportController.php
  - symfony/src/Application/Demo/HltvImportMessage.php
  - symfony/src/Application/Demo/HltvImportHandler.php
  - symfony/src/Application/Demo/Cron/HltvTopMatchesCommand.php
key-decisions:
  - "Created HltvImportHandler to orchestrate the Node.js scraper call and dispatch ImportDemoMessage."
  - "Created admin-only HltvImportController for manual queueing of HLTV URLs."
  - "Created HltvTopMatchesCommand to seed the system with top tier HLTV matches automatically."
---

# Phase 16 Plan 03: Symfony Trigger & Background Cron Summary

Integrated the HLTV scraper into the Symfony application via an asynchronous Messenger handler, exposed it for manual Admin usage, and automated it via a CLI Command.

## What was done
- Created `HltvImportMessage` and `HltvImportHandler` to process requests to the scraper asynchronously.
- The handler captures Cloudflare blocks correctly, marks the `Demo` entity with `cloudflare_blocked`, and gracefully completes without entering a retry loop.
- The handler also dispatches a standard `ImportDemoMessage` containing the demo URL to actually handle the physical downloading of the `.dem` file downstream.
- Implemented `HltvImportController` providing a secure `POST /api/admin/hltv-import` endpoint for manual triggers.
- Developed `HltvTopMatchesCommand` that parses the HLTV results page for matches and queues any new URLs it discovers.

## Next Steps
Phase complete, ready for next step.
