# Civic Brief communication and branding notes

## Product pairing
- Civic Mandate Nigeria collects concrete public-service demands; ISEYC human-reviews submissions and only explicitly Published records appear in public views.
- Civic Brain is a reading companion for published records, not a poll, ranking, campaign tool or national opinion survey.
- A recommendation is not a referral sent; publication is not proof of government action or resolution.

## Required evidence-answer format
Every evidence answer must use these headings in this order:
1. What the public record shows
2. What it does not mean
3. What remains unknown
4. Useful next step

Keep the sections concise and mobile-friendly. Link to https://2027-street-mandate.vercel.app when relevant. The server-owned prompt defines the contract; clients must not be able to override it.

## Branding asset status
The repository currently contains `public/iseyc-logo.svg`. It does not contain `public/iseyc-seal.png` on the inspected branch. Header and footer therefore use the existing SVG as an interim logo rather than referencing a missing image.

**Founder action:** add the approved official seal at exactly `public/iseyc-seal.png` when available. Then update `src/components/ui/Header.jsx` and `src/components/ui/Footer.jsx` to use it, and verify its appearance on a 360px-wide phone. Do not manufacture a replacement seal or describe the interim SVG as the official seal.

## Safety boundary
Evidence is published-only and read-only. No private submission fields, invented officeholder contacts, automatic official contact, rankings or endorsements.
