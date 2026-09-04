# QA Checklist — Super Admin Panel (CMOS-13)

Go through every page below with a real Master Admin login. Check off
each item; note anything broken with enough detail to reproduce it
(what you clicked, what you expected, what happened).

## Dashboard
- [ ] KPI cards show real numbers (Total Stores, Active, Suspended,
      Pending Approvals) — not placeholders or zeros when data exists
- [ ] Recent Activity feed shows real, recent entries
- [ ] All numbers update after you take an action elsewhere (e.g.
      approve a store, then come back — does the count change?)

## Store Management
- [ ] Store list loads and shows all real stores
- [ ] Search/filter (if built) actually filters correctly
- [ ] Status pills show correct colors (Pending=amber, Approved=green,
      Suspended=red, Rejected=red/gray)
- [ ] Approve button works and updates status immediately
- [ ] Suspend button requires a reason and updates status
- [ ] Owner name/email displays correctly per store

## Theme Editor
- [ ] Opening the editor loads the correct store's current draft/theme
- [ ] Editing a color/logo updates the live preview
- [ ] Save Draft doesn't affect the published/live storefront
- [ ] Publish actually updates what the public storefront shows
- [ ] Version History shows past versions; Restore works

## Verification Center
- [ ] New applications appear with correct status
- [ ] Opening an application shows all submitted info correctly
- [ ] Approve/Reject/Suspend from here behaves the same as from Store
      Management (single source of truth, not two different behaviors)

## Audit Log
- [ ] Shows real entries for actions you just took (approve, suspend,
      theme publish, etc.)
- [ ] Filtering/search (if built) works
- [ ] Timestamps are accurate

## Profile
- [ ] Shows correct logged-in admin's email/name
- [ ] Password change works (test with a throwaway password, then
      change it back)

## General
- [ ] No console errors in the browser dev tools on any page
- [ ] Works correctly at a narrower browser width (basic mobile check)
- [ ] Logging out and back in works cleanly
