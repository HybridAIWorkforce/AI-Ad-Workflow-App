# AI Ad Workflow — Master Build Sheet

> **Generated:** April 13, 2026
> **Project Root:** `/home/ubuntu/ai_ad_workflow/nextjs_space`
> **Status:** ~85% Complete — Voice generation regex fix pending verification

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [File Structure](#3-file-structure)
4. [Database Schema](#4-database-schema)
5. [API Endpoints Reference](#5-api-endpoints-reference)
6. [Feature Status Matrix](#6-feature-status-matrix)
7. [Environment Variables](#7-environment-variables)
8. [Known Bugs & Issues](#8-known-bugs--issues)
9. [Prioritized Task Checklist](#9-prioritized-task-checklist)
10. [Architecture & Data Flow](#10-architecture--data-flow)
11. [Quick Start Guide](#11-quick-start-guide)

---

## 1. Project Overview

### What Is This?
An AI-powered ad creation workflow system based on a video tutorial. Users fill out an intake form describing their product, and the system guides them through a **6-step AI workflow** to produce a complete ad package — from strategy to generated images and voiceovers.

### Core User Journey
```
Login -> Dashboard -> New Project (Intake Form) -> 6-Step Workflow -> Export
```

### The 6-Step Workflow
| Step | Name | What It Does | Output Type |
|------|------|-------------|-------------|
| 1 | **Strategy Engine** | Product analysis, PAS framework, viral hooks | Text (strategy brief) |
| 2 | **Style Engine** | Visual specs, character/product design | Text (style spec) |
| 3 | **Script Engine** | Scene-by-scene scripts with VO, music, SFX | Text (script) |
| 4 | **Image Scene Generation** | Nano Banana Pro prompts + actual images via Gemini/DALL-E | Text + Generated Images |
| 5 | **Video Engine VEO JSON** | Google VEO 3.1 JSON blocks | Text (VEO JSON) |
| 6 | **Voice Generation** | ElevenLabs text-to-speech from Step 3 script | Generated Audio Clips |

### Authentication
- **Provider:** NextAuth with credentials (email/password + bcrypt)
- **Default User:** `john@doe.com` / `johndoe123`

---

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL (Abacus AI hosted) |
| ORM | Prisma |
| Auth | NextAuth.js (Credentials provider) |
| File Storage | AWS S3 (Abacus AI hosted) |
| LLM API | Abacus AI (OpenAI-compatible, ABACUSAI_API_KEY) |
| Image Generation | Google Gemini Imagen 3 (primary) / OpenAI DALL-E 3 (fallback) |
| Voice Generation | ElevenLabs Text-to-Speech API |
| Animation | Framer Motion |
| Icons | Lucide React |
| Notifications | Sonner (toast) |

---

## 3. File Structure

```
nextjs_space/
  app/
    layout.tsx                          # Root layout (providers, metadata, hydration fix)
    page.tsx                            # Landing page
    login/page.tsx                      # Login page
    dashboard/
      layout.tsx                        # Dashboard layout wrapper
      page.tsx                          # Dashboard home (project list)
      new/page.tsx                      # New project intake form page
      settings/page.tsx                 # Settings page
      project/[id]/page.tsx             # Individual project workflow page
    api/
      auth/[...nextauth]/route.ts       # NextAuth handler
      signup/route.ts                   # User registration
      chatbot/route.ts                  # Chatbot proxy
      settings/route.ts                 # App settings CRUD
      prompts/route.ts                  # Master prompts CRUD
      projects/
        route.ts                        # List/create projects
        [id]/route.ts                   # Get/update/delete project
      upload/
        presigned/route.ts              # S3 presigned upload URL
        get-url/route.ts                # Get public URL from cloud path
      workflow/
        generate/route.ts               # LLM text generation (Steps 1-5)
        approve/route.ts                # Approve/save step deliverable
        generate-images/route.ts        # Image generation (Step 4)
        generate-voice/route.ts         # Voice generation (Step 6)
  components/
    providers.tsx                       # SessionProvider + ThemeProvider
    landing-page.tsx                    # Marketing landing page
    login-form.tsx                      # Login form component
    dashboard-layout-client.tsx         # Sidebar + navigation
    dashboard-content.tsx               # Project listing grid
    new-project-form.tsx                # Intake form with image upload
    project-workflow.tsx                # CORE: 6-step workflow UI (785 lines)
    settings-content.tsx                # Master prompt editor
    chatbot-widget.tsx                  # Chat assistant widget
    theme-provider.tsx                  # Dark/light theme
    ui/                                 # shadcn/ui components (50+ files)
  lib/
    auth-options.ts                     # NextAuth config
    db.ts                               # Prisma client singleton
    s3.ts                               # S3 utilities (presigned URLs, uploads)
    types.ts                            # Shared TypeScript types
    utils.ts                            # Utility functions
  prisma/
    schema.prisma                       # Database schema (7 models)
  scripts/
    seed.ts                             # Seeds user, 6 master prompts, settings (897 lines)
  .env                                  # Environment variables
  tailwind.config.ts                    # Tailwind configuration
  next.config.js                        # Next.js configuration
```

---

## 4. Database Schema

### Entity Relationship Diagram
```
  User (8 rows)
    |
    |--< Project (2 rows)
           |
           |--< Deliverable (11 rows)   [unique: projectId+stepNumber]
           |--< ProjectImage (0 rows)    [generated images]
           |--< ProjectAudio (2 rows)    [generated voiceovers]

  MasterPrompt (6 rows)   [one per workflow step]
  AppSettings (2 rows)     [voice/tone profile]
```

### Models Detail

**User**
- id (String, cuid), email (unique), name?, password (bcrypt), createdAt, updatedAt
- Relations: has many Projects

**Project**
- id, name, intakeData (JSON), currentStep (Int, default 1), status (default "in_progress")
- userId -> User
- Relations: has many Deliverables, ProjectImages, ProjectAudios

**Deliverable**
- id, projectId, stepNumber, content (Text), approved (Boolean)
- Unique constraint: (projectId, stepNumber) - one deliverable per step per project

**MasterPrompt**
- id, stepNumber (unique), stepName, promptText (Text), updatedAt
- Stores the full master prompt templates with {{variable}} placeholders

**AppSettings**
- id, voiceToneProfile (Text), updatedAt

**ProjectImage**
- id, projectId, stepNumber, sceneNumber (default 1), imageUrl, cloudStoragePath?, promptUsed (Text), isPublic
- Currently stores base64 data URIs (not S3 URLs)

**ProjectAudio**
- id, projectId, stepNumber, sceneNumber (default 1), audioUrl, cloudStoragePath?, voiceoverText (Text), voiceId?, isPublic
- Currently stores base64 data URIs (not S3 URLs)

---

## 5. API Endpoints Reference

### Authentication
| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| POST | /api/auth/[...nextauth] | NextAuth login/session | Working |
| POST | /api/signup | Register new user | Working |

### Projects
| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| GET | /api/projects | List user projects | Working |
| POST | /api/projects | Create new project | Working |
| GET | /api/projects/[id] | Get project + deliverables + images + audios | Working |
| PUT | /api/projects/[id] | Update project | Working |
| DELETE | /api/projects/[id] | Delete project | Working |

### Workflow
| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| POST | /api/workflow/generate | Generate step deliverable via LLM | Working |
| POST | /api/workflow/approve | Approve/save a step | Working |
| POST | /api/workflow/generate-images | Generate images via Gemini/DALL-E | Untested (0 images in DB) |
| POST | /api/workflow/generate-voice | Generate voiceovers via ElevenLabs | Fix applied, needs verification |
| GET | /api/workflow/generate-voice | List available ElevenLabs voices | Working |

### Settings, Prompts, Upload, Chatbot
| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| GET/PUT | /api/settings | Read/update voice-tone profile | Working |
| GET/PUT | /api/prompts | Read/update master prompts | Working |
| POST | /api/upload/presigned | Get S3 presigned upload URL | Working |
| POST | /api/upload/get-url | Get public URL from cloud path | Working |
| POST | /api/chatbot | Chat assistant proxy | Working |

---

## 6. Feature Status Matrix

### Fully Completed
| Feature | Key Files |
|---------|----------|
| Auth System (login/signup, bcrypt) | lib/auth-options.ts, login-form.tsx |
| Dashboard (project listing grid) | dashboard-content.tsx |
| Intake Form (product info + S3 image upload with MIME+extension validation) | new-project-form.tsx |
| Steps 1-5 Text Generation (LLM with master prompts + variable replacement) | api/workflow/generate/route.ts |
| Step Approval (approve/edit deliverables, advance workflow) | api/workflow/approve/route.ts |
| Settings Page (edit 6 master prompts + voice/tone profile) | settings-content.tsx |
| Chatbot Widget (purple bottom-right) | chatbot-widget.tsx |
| S3 Image Upload (presigned URL + public URL retrieval) | api/upload/ |
| Master Prompts (6 detailed prompts seeded) | scripts/seed.ts |
| Image Upload PDF Fix (dual MIME+extension validation, HEIC support) | new-project-form.tsx |

### Partially Complete / Needs Verification
| Feature | What Works | What is Pending |
|---------|-----------|----------------|
| Image Generation (Step 4) | API endpoint, Gemini + DALL-E fallback coded | 0 images in DB - generation may be failing (API format, key validity, prompt regex) |
| Voice Generation (Step 6) | API works, ElevenLabs integration, 2 audios exist | Smart quotes fix applied but NOT verified |

### Not Implemented / Missing
| Feature | Notes |
|---------|-------|
| Export/Download | No way to export final ad package as ZIP |
| Project Delete UI | API exists but no delete button in dashboard |
| Voice Selector UI | GET endpoint exists but no dropdown to pick voices |
| Reference Image in Workflow | Uploaded to S3 but may not display in workflow view |
| Deployment | App has never been deployed to a public URL |

---

## 7. Environment Variables

| Variable | Purpose | Source |
|----------|---------|--------|
| DATABASE_URL | PostgreSQL connection | Abacus AI hosted |
| NEXTAUTH_SECRET | JWT signing secret | Auto-generated |
| AWS_PROFILE | S3 auth (hosted_storage) | Abacus AI |
| AWS_REGION | S3 region (us-west-2) | Abacus AI |
| AWS_BUCKET_NAME | S3 bucket for uploads | Abacus AI |
| AWS_FOLDER_PREFIX | S3 key prefix | Abacus AI |
| ABACUSAI_API_KEY | LLM API for Steps 1-5 text generation | Abacus AI |
| GEMINI_API_KEY | Google Gemini Imagen 3 (image gen) | User-provided |
| OPENAI_API_KEY | OpenAI DALL-E 3 fallback (image gen) | User-provided |
| ELEVENLABS_API_KEY | ElevenLabs TTS (voice gen) | User-provided |

> Note: GEMINI_API_KEY and OPENAI_API_KEY are user-provided external keys. Verify validity/quota if image generation fails.

---

## 8. Known Bugs & Issues

### BUG-1: Voice Generation Smart Quotes (CRITICAL)
- **Symptom:** Only 2 short clips generated with wrong scene numbers
- **Root Cause:** Step 3 script uses curly/smart quotes instead of regular double quotes. Regex could not match voiceover text.
- **Fix Applied:** Updated extractVoiceovers() to normalize line endings and convert smart quotes before extraction. Added multiple fallback regex patterns.
- **Status:** Fix applied but NOT verified (dev server restart was in progress when conversation ended)
- **File:** app/api/workflow/generate-voice/route.ts, lines 21-79

### BUG-2: Image Generation Zero Output
- **Symptom:** ProjectImage table has 0 rows despite the feature being coded
- **Possible Causes:**
  - Gemini Imagen API endpoint format may be incorrect (imagen-3.0-generate-002:predict)
  - API key quota/billing issues
  - Prompt extraction regex not matching actual Step 4 deliverable format
  - DALL-E fallback key may be expired/invalid
- **Status:** Not investigated - user has not reported this yet
- **File:** app/api/workflow/generate-images/route.ts

### BUG-3: Image Upload PDF Detection (RESOLVED)
- **Symptom:** Uploaded images classified as PDFs
- **Fix:** Added dual validation (MIME type + file extension), HEIC support
- **Status:** Fixed and verified

---

## 9. Prioritized Task Checklist

### Critical - Must Fix

- [ ] **Verify voice generation smart quotes fix**
  - Run app, navigate to project with Step 3 script
  - Click Generate Voice on Step 6
  - Confirm all scenes extracted with correct numbering
  - Check audio playback
  - File: app/api/workflow/generate-voice/route.ts

- [ ] **Investigate and fix image generation (0 images)**
  - Test Gemini API key validity with curl
  - Check prompt extraction regex vs actual Step 4 output format
  - Test DALL-E fallback with OpenAI key
  - May need to update Gemini API endpoint URL or auth format
  - File: app/api/workflow/generate-images/route.ts

### High Priority - Should Do

- [ ] **Deploy the app to a public URL**
  - App has never been deployed

- [ ] **Add voice selector dropdown in Step 6 UI**
  - GET endpoint for listing voices already exists
  - Need dropdown in project-workflow.tsx Step 6 section

- [ ] **Verify reference image display in workflow**
  - Confirm uploaded reference image shows in project workflow view

### Medium Priority - Nice to Have

- [ ] **Add export/download functionality** (ZIP of images, audio, scripts)
- [ ] **Add project delete button in dashboard** (API exists, need UI)
- [ ] **Store generated images/audio in S3 instead of base64** (reduce DB bloat)
- [ ] **Add progress indicators for generation** (scene X of Y...)

### Low Priority - Future Enhancements

- [ ] Project status filtering on dashboard
- [ ] Project search/sort
- [ ] Multi-user roles
- [ ] Webhook notifications when generation completes
- [ ] Rate limiting on generation endpoints

---

## 10. Architecture & Data Flow

### Text Generation Flow (Steps 1-5)
```
User clicks "Generate" on Step N
  |
  v
POST /api/workflow/generate { projectId, stepNumber }
  |
  v
1. Load MasterPrompt for stepNumber
2. Load intakeData from Project
3. Load previous step Deliverables
4. Replace {{vars}} in template
  |
  v
Abacus AI LLM API (OpenAI-compatible)
  |
  v
Save to Deliverable (upsert by projectId+stepNumber)
  |
  v
Return content to UI
```

### Image Generation Flow (Step 4)
```
User clicks "Generate Images" on Step 4
  |
  v
POST /api/workflow/generate-images { projectId }
  |
  v
1. Load Step 4 Deliverable content
2. Extract scene prompts via regex
3. For each scene:
   -> Try Gemini Imagen 3
   -> Fallback: DALL-E 3
4. Save to ProjectImage table
```

### Voice Generation Flow (Step 6)
```
User clicks "Generate Voice" on Step 6
  |
  v
POST /api/workflow/generate-voice { projectId, voiceId? }
  |
  v
1. Load Step 3 Deliverable (the script)
2. Normalize: fix line endings + convert smart quotes
3. Extract VOICEOVER text per scene via regex
4. For each scene: ElevenLabs TTS API -> base64 audio
5. Save to ProjectAudio table
```

### Master Prompt Variable Replacements
```
{{productName}}     -> intakeData.productName
{{coreDescription}} -> intakeData.coreDescription
{{primaryOffer}}    -> intakeData.primaryOffer
{{targetPlatform}}  -> intakeData.targetPlatform
{{adLength}}        -> intakeData.adLength
{{adStyle}}         -> intakeData.adStyle
{{hasCharacter}}    -> "Yes" / "No"
{{voiceTone}}       -> AppSettings.voiceToneProfile
{{strategyBrief}}   -> Step 1 deliverable content
{{styleSpec}}       -> Step 2 deliverable content
{{script}}          -> Step 3 deliverable content
{{imagePrompts}}    -> Step 4 deliverable content
```

---

## 11. Quick Start Guide

### Resume Development
```bash
cd /home/ubuntu/ai_ad_workflow/nextjs_space
yarn dev
# App runs on localhost:3000
```

### Login Credentials
- Email: john@doe.com
- Password: johndoe123

### Key Files to Edit
| What You Want to Change | File to Edit |
|-------------------------|-------------|
| Workflow UI (buttons, displays, steps) | components/project-workflow.tsx |
| Master prompt templates | scripts/seed.ts (then re-seed) |
| Image generation logic | app/api/workflow/generate-images/route.ts |
| Voice generation logic | app/api/workflow/generate-voice/route.ts |
| LLM text generation | app/api/workflow/generate/route.ts |
| Intake form fields | components/new-project-form.tsx |
| Dashboard layout/nav | components/dashboard-layout-client.tsx |
| Settings page | components/settings-content.tsx |
| Database schema | prisma/schema.prisma |
| Styles/theme | tailwind.config.ts, app/globals.css |

### Ad Styles Supported
1. Movie Style, 2. UGC Trend, 3. Product Demo, 4. Fantasy Epic, 5. Unboxing
6. Testimonial, 7. Before/After, 8. ASMR, 9. Stop Motion, 10. Meme Style, 11. Luxury

### Seed the Database
```bash
cd /home/ubuntu/ai_ad_workflow/nextjs_space
yarn ts-node scripts/seed.ts
```

### Prisma Commands
```bash
yarn prisma db push       # After schema changes
yarn prisma generate      # Regenerate client
yarn prisma studio        # View database GUI
```

---

*End of Master Build Sheet*
