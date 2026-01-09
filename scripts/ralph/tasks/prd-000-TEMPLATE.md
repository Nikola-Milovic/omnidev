# PRD-000: Feature Name Template

**Status:** Template  
**Priority:** N/A  
**Estimated Effort:** [Small/Medium/Large]

---

## Introduction / Overview

Brief description of the feature and the problem it solves. Keep it to 2-3 sentences.

**Example:**
> This feature allows users to save their favorite items for quick access later. Currently, users must search for items repeatedly, which is time-consuming. A favorites system improves user efficiency and satisfaction.

---

## Goals

Specific, measurable objectives:

- Goal 1: Allow users to save and retrieve favorite items
- Goal 2: Reduce time to access frequently used items by 50%
- Goal 3: Increase user engagement with the platform

---

## User Stories

### US-001: [Short Title]

**Description:** As a [user type], I want [feature] so that [benefit].

**Example:**
> As a user, I want to mark items as favorites so that I can quickly access them later without searching.

**Acceptance Criteria:**
- [ ] User can click a heart icon to favorite an item
- [ ] Favorited items appear in a "Favorites" page
- [ ] User can unfavorite items
- [ ] Favorites persist across sessions
- [ ] Typecheck passes
- [ ] **[If UI]** Verify in browser

---

### US-002: [Another Story]

Repeat format above. Keep stories small and focused.

---

## Functional Requirements

**Format:** Numbered, specific, unambiguous requirements.

- **FR-1:** The system must allow users to favorite any item by clicking a heart icon
- **FR-2:** When a user clicks the heart icon, the system must save the favorite to the database
- **FR-3:** The system must display a "Favorites" page listing all user favorites
- **FR-4:** The system must allow users to remove favorites by clicking the heart icon again
- **FR-5:** Favorites must persist when the user logs out and logs back in
- **FR-6:** The heart icon must show filled state when item is favorited, outline when not

---

## Non-Goals (Out of Scope)

What this feature will NOT include:

- ❌ No sharing favorites with other users
- ❌ No organizing favorites into folders/categories
- ❌ No sorting/filtering favorites (use default order)
- ❌ No favorite limit enforcement (unlimited favorites for v1)

---

## User Journey

Detailed step-by-step flow of how users interact with the feature.

### Journey 1: Add Item to Favorites

1. User navigates to items list page
2. User sees heart icon (outline) on each item card
3. User clicks heart icon on desired item
4. Heart icon changes to filled state
5. Toast notification appears: "Added to favorites"
6. Item is now saved to favorites

### Journey 2: View Favorites

1. User clicks "Favorites" link in navigation menu
2. System displays favorites page
3. User sees list of all favorited items
4. Each item shows filled heart icon

### Journey 3: Remove from Favorites

1. User is on any page showing favorited item
2. User clicks filled heart icon
3. Heart icon changes to outline state
4. Toast notification: "Removed from favorites"
5. Item disappears from favorites page (if currently viewing it)

---

## UX Guidelines

Specific design and interaction patterns.

### Visual Design
- Heart icon: Use lucide-react `Heart` component
- Unfavorited state: Outline icon, gray color
- Favorited state: Filled icon, red color (#EF4444)
- Icon size: 20x20px
- Icon position: Top right corner of item cards

### Interactions
- Click/tap: Toggle favorite state
- Hover: Show tooltip "Add to favorites" / "Remove from favorites"
- Loading state: Disable icon briefly while saving
- Transition: Smooth scale animation (0.95 → 1.05 → 1.0 on click)

### Feedback
- Toast notification on favorite/unfavorite
- Optimistic UI update (update immediately, rollback on error)
- Error handling: Show error toast, revert icon state

### Favorites Page
- Layout: Grid layout (3 columns on desktop, 2 on tablet, 1 on mobile)
- Empty state: Show friendly message with icon when no favorites
- Loading state: Show skeleton loaders
- Sort order: Most recently favorited first

---

## System Behaviors

How the system works internally.

### Favoriting an Item

**Trigger:** User clicks heart icon

**Process:**
1. Frontend immediately updates icon to filled (optimistic)
2. Frontend sends POST /api/favorites with { itemId }
3. Backend validates user is authenticated
4. Backend checks if favorite already exists (idempotent)
5. Backend inserts row into favorites table
6. Backend returns success with favorite object
7. Frontend shows success toast
8. If error: Frontend reverts icon, shows error toast

### Unfavoriting an Item

**Trigger:** User clicks filled heart icon

**Process:**
1. Frontend immediately updates icon to outline (optimistic)
2. Frontend sends DELETE /api/favorites/:id
3. Backend validates user owns this favorite
4. Backend deletes row from favorites table
5. Backend returns success
6. Frontend shows success toast, removes from favorites list if on that page
7. If error: Frontend reverts icon, shows error toast

### Loading Favorites

**Trigger:** User navigates to favorites page

**Process:**
1. Frontend shows loading skeleton
2. Frontend sends GET /api/favorites
3. Backend queries favorites table for current user
4. Backend joins with items table to get item details
5. Backend returns array of favorite items
6. Frontend displays items in grid layout

---

## Data & Contracts

### Database Schema

```sql
-- Add to schema
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_item_id ON favorites(item_id);
```

### TypeScript Types

```typescript
// Add to types
export interface Favorite {
  id: string;
  userId: string;
  itemId: string;
  createdAt: string;
}

export interface FavoriteWithItem extends Favorite {
  item: Item; // Full item object
}
```

### API Endpoints

#### POST /api/favorites

**Purpose:** Add item to favorites

**Request:**
```json
{
  "itemId": "uuid"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "itemId": "uuid",
  "createdAt": "2026-01-09T10:30:00Z"
}
```

**Errors:**
- 401: Not authenticated
- 404: Item not found
- 409: Already favorited (return existing favorite)

---

#### DELETE /api/favorites/:itemId

**Purpose:** Remove item from favorites

**Response (200):**
```json
{
  "success": true
}
```

**Errors:**
- 401: Not authenticated
- 404: Favorite not found

---

#### GET /api/favorites

**Purpose:** Get all favorites for current user

**Response (200):**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "itemId": "uuid",
    "createdAt": "2026-01-09T10:30:00Z",
    "item": {
      "id": "uuid",
      "name": "Item Name",
      "description": "...",
      "imageUrl": "...",
      ...
    }
  }
]
```

**Errors:**
- 401: Not authenticated

---

## Touchpoints

Files that need to be modified (helps Ralph know where to look):

### Database
- `db/schema.sql` - Add favorites table
- `db/seed/XX_favorites.sql` - Add seed data (optional)

### Backend
- `src/types/favorites.ts` - TypeScript types
- `src/routes/favorites.ts` - API endpoints
- `src/services/favorites-service.ts` - Business logic
- `src/middleware/auth.ts` - Ensure auth required

### Frontend
- `src/components/FavoriteButton.tsx` - Heart icon button component
- `src/components/ItemCard.tsx` - Add FavoriteButton to cards
- `src/pages/FavoritesPage.tsx` - Favorites list page
- `src/api/favorites.ts` - API client functions
- `src/hooks/useFavorites.ts` - React hook for favorites
- `src/routes/index.tsx` - Add /favorites route

### Shared
- `packages/shared/types.ts` - Shared types if monorepo

---

## Edge Cases

Scenarios that need special handling:

1. **User favorites item that gets deleted**
   - Solution: ON DELETE CASCADE in schema removes favorite automatically

2. **User clicks favorite button rapidly (race condition)**
   - Solution: Disable button during request, use debouncing

3. **Offline favoriting**
   - Solution: Queue request, retry when online (or show error for v1)

4. **User has 1000+ favorites**
   - Solution: Implement pagination (or accept slow load for v1)

5. **Two tabs, user favorites in one tab**
   - Solution: Use cache invalidation / polling (or accept stale state for v1)

6. **Item no longer available but favorited**
   - Solution: Show item as unavailable in favorites list, allow unfavoriting

---

## Technical Considerations

### Performance
- Index on user_id and item_id for fast queries
- Consider caching favorite IDs in memory for "is favorited" checks
- Lazy load item details when opening favorites page

### Security
- Ensure users can only favorite/unfavorite their own items
- Validate itemId exists before inserting favorite
- Rate limit favorite API to prevent abuse

### Testing
- Unit test: FavoriteButton component
- Integration test: POST/DELETE/GET endpoints
- E2E test: Full favorite/unfavorite/view flow

---

## Success Metrics

How we measure if this feature is successful:

- **Usage:** 50%+ of active users create at least one favorite within first week
- **Engagement:** Users with favorites have 20% higher session duration
- **Efficiency:** Time to access frequently used items reduced by 40%+
- **Satisfaction:** NPS score increase of 5+ points

---

## Open Questions

Questions that need answers before or during implementation:

1. Should favorites have a maximum limit? (Decision: No limit for v1)
2. Should we show favorite count publicly? (Decision: No, private for v1)
3. Should we allow favoriting from search results? (Decision: Yes, same UX)
4. Should favorites have categories/tags? (Decision: No, out of scope)

---

## Implementation Notes

### Suggested Implementation Order (for Ralph orchestration)

**Story 1: Database (Priority 1)**
- Scope: "Database schema only"
- Add favorites table
- Run migration
- Generate types

**Story 2: Backend API (Priority 2)**
- Scope: "Backend API endpoints and services"
- Create favorites service
- Create API routes
- Add authentication checks

**Story 3: Frontend Components (Priority 3)**
- Scope: "Frontend FavoriteButton component only"
- Build FavoriteButton component
- Add to ItemCard component
- Hook up API calls

**Story 4: Favorites Page (Priority 4)**
- Scope: "Frontend Favorites page UI"
- Create FavoritesPage component
- Add route
- Add navigation link

**Story 5: Polish (Priority 5)**
- Scope: "Loading states, error handling, edge cases"
- Add loading skeletons
- Add error boundaries
- Handle edge cases
- Browser verification

---

## Dependencies

Features or systems this depends on:

- ✅ User authentication system (already implemented)
- ✅ Items database and API (already implemented)
- ❌ None - this feature is standalone

---

## References

Links to related documentation:

- API patterns: `docs/api-patterns.md`
- Database conventions: `docs/database.md`
- Component library: `docs/components.md`
- Design system: `docs/design-system.md`

---

**Template Usage:**

When creating a new PRD:
1. Copy this template to `tasks/prd-XXX-feature-name.md`
2. Fill in all sections
3. Remove placeholder text and examples
4. Add real requirements and details
5. Be specific and unambiguous
6. Include examples where helpful
7. Don't skip sections - "None" is a valid answer

**Remember:** The more detailed your PRD, the better Ralph can implement it autonomously.

