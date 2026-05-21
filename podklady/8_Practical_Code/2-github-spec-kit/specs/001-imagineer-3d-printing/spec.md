# Feature Specification: Imagineer — On-Demand Custom 3D Printing

**Feature Branch**: `001-imagineer-3d-printing`
**Created**: 2026-05-05
**Status**: Draft
**Input**: User description: "Imagineer is an on-demand custom 3D printing service that lets anyone create a physical object from a text description or a reference image — no modeling skills required. Customers describe what they want or upload a photo, our platform generates a 3D model using AI, and they preview and approve it in the browser before we print and ship the finished piece. We handle the entire pipeline end-to-end: AI generation, print-readiness checks, material and color selection, fulfillment, and delivery. The target audience is hobbyists, gift-buyers, tabletop gamers, designers prototyping ideas, and anyone who has imagined a physical object but lacks the skills, software, or hardware to make it real."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Text-to-Print Custom Object (Priority: P1)

A first-time customer arrives with an idea — "a chess knight shaped like a dragon" — but no modeling skill. They type the description, watch a 3D model materialize in the browser within a minute or two, rotate it to inspect it, optionally regenerate it if they don't love the first result, pick a material and color, see a firm price and delivery estimate, pay, and receive the printed object at their door a few days later.

**Why this priority**: This is the core promise of the product and the simplest entry path. Without this loop working end-to-end, nothing else matters. It is the smallest slice that proves the business: idea in, physical object out, money exchanged.

**Independent Test**: A user with no prior account can complete the entire journey from landing page to receiving a printed object using only a text prompt. The journey can be validated in isolation by running the full pipeline once and confirming the delivered object matches the approved on-screen preview.

**Acceptance Scenarios**:

1. **Given** a new visitor on the landing page, **When** they enter a text description and submit, **Then** an interactive 3D preview of the generated model appears within the system's stated generation time and the preview can be rotated, zoomed, and inspected from any angle.
2. **Given** a generated model the customer is satisfied with, **When** they choose a material and color from the catalog, **Then** the system displays a firm total price and an estimated delivery date before requesting payment.
3. **Given** a customer who has paid, **When** the order enters fulfillment, **Then** the customer receives status updates at each major milestone (in production, shipped, delivered) without needing to log in.
4. **Given** a generated model the customer wants to refine, **When** they request a regeneration with the same or modified prompt, **Then** a new model variant is produced and the customer can compare it to prior attempts before approving one.
5. **Given** a delivered order, **When** the customer inspects the printed object, **Then** the physical object visibly matches the approved preview in shape and proportions, and uses the selected material and color.

---

### User Story 2 - Image-to-Print from a Reference Photo (Priority: P2)

A customer has a photo of an object they want recreated — a one-of-a-kind keepsake, a damaged figurine, a handmade prototype — and uploads the image instead of describing it in words. The platform interprets the image into a printable 3D model and the rest of the journey mirrors the text path.

**Why this priority**: Image input dramatically widens the addressable audience (gift-buyers, replacement-part seekers, sentimental-object recreators) but is harder to deliver well than text-to-3D. It is built on top of the same downstream preview→approve→pay→fulfill pipeline as P1, so it adds value without re-architecting the order flow.

**Independent Test**: A user can upload a single reference image and reach a previewable 3D model without ever typing a description, then complete the same approval-and-purchase flow as P1.

**Acceptance Scenarios**:

1. **Given** a customer with a photo of a real-world object, **When** they upload the image, **Then** a 3D model interpretation of the object appears in the same preview surface used by the text path.
2. **Given** an uploaded image whose subject is ambiguous or partially obscured, **When** generation completes, **Then** the customer is shown the system's interpretation alongside an option to add a clarifying text hint and regenerate.
3. **Given** an image of a copyrighted character or trademarked product, **When** the customer attempts to generate, **Then** the system declines to produce the model and explains why in plain language.

---

### User Story 3 - Material and Color Selection with Transparent Tradeoffs (Priority: P3)

Once a model is approved, the customer chooses how it will be printed. They see the available materials (e.g., standard plastic, durable plastic, resin, flexible) and color options for each, with each choice showing its impact on price, lead time, durability, and finish quality before they commit.

**Why this priority**: Material selection is critical for satisfaction (a flexible toy vs. a brittle ornament behaves very differently in the customer's hands) but the P1 flow can ship with a single sensible default ("standard plastic, white") and still deliver value. Expanding the catalog and showing tradeoffs is a layered improvement.

**Independent Test**: A customer with an approved model can switch among at least three materials and several colors per material, see live updates to price and delivery date, and submit the order with their final choice.

**Acceptance Scenarios**:

1. **Given** an approved model and the material selector, **When** the customer changes material, **Then** the displayed price, lead time, and a short plain-language description of the material's properties update immediately.
2. **Given** the selected material, **When** the customer browses colors, **Then** only colors actually available for that material are shown.
3. **Given** a material that is temporarily out of stock, **When** the customer views it, **Then** it is clearly labelled unavailable with an estimated restock date and the customer cannot select it.

---

### Edge Cases

- **Generation fails or produces nothing usable**: The customer sees a clear failure message (not a crash), is not charged, and can retry with the same or a modified prompt.
- **Generated model fails print-readiness checks** (non-manifold geometry, wall thickness below the chosen material's minimum, exceeds build volume): The system either auto-repairs and shows the customer the repaired model, or declines the model with a plain-language explanation and offers a regeneration.
- **Prompt or image describes a copyrighted, trademarked, or restricted subject** (weapons, real persons, branded characters): The system declines before generation and explains the reason; nothing is charged.
- **Object exceeds maximum printable dimensions**: The customer is offered a scaled-down preview and told what the maximum is; a refusal-to-proceed-at-full-scale path exists.
- **Customer abandons mid-flow**: A generated preview is preserved for some bounded period so the customer can return and resume without re-paying for generation.
- **Payment fails after approval**: The order does not enter production; the approved model and selections are held briefly so the customer can retry payment.
- **Shipping address is invalid or undeliverable**: The customer is notified before fulfillment begins, not after the print is complete.
- **Print fails at the printer (machine fault, material jam)**: The customer is automatically notified, the failed print is reprinted at no extra cost, and the original delivery estimate is updated.
- **Customer reports the delivered object does not match the approved preview**: A defined return/reprint path exists with clear eligibility rules.
- **Regeneration limit reached**: The customer is told how many regenerations remain and what additional regenerations would cost, before they hit the limit.

## Requirements *(mandatory)*

### Functional Requirements

#### Input & Generation
- **FR-001**: System MUST accept a text description of an object as input from any visitor without requiring an account at the time of generation.
- **FR-002**: System MUST accept an image upload (single image of a real-world object or sketch) as an alternative input mode.
- **FR-003**: System MUST generate an interactive 3D model from the input within a stated time budget visible to the customer before they submit.
- **FR-004**: System MUST allow the customer to regenerate a model from the same or modified input and compare attempts within a single session.
- **FR-005**: System MUST refuse generation for inputs identified as copyrighted, trademarked, depicting real identifiable persons, or otherwise prohibited, and explain the refusal in plain language.

#### Preview & Approval
- **FR-006**: System MUST present each generated model in a browser-based 3D viewer that supports rotate, zoom, and pan, on standard desktop and mobile browsers.
- **FR-007**: System MUST allow the customer to approve a model as the basis for the order, or discard it.
- **FR-008**: System MUST preserve generated previews for an authenticated or session-bound customer for a bounded period so they can resume an in-progress order later.

#### Print-Readiness & Material Selection
- **FR-009**: System MUST validate every approved model for print-readiness (manifold geometry, minimum wall thickness for the selected material, fit within the printer's build volume) before accepting payment.
- **FR-010**: System MUST present a catalog of materials with, for each, the colors available, the price impact, the lead-time impact, and a plain-language description of the material's properties.
- **FR-011**: System MUST hide or clearly mark unavailable material/color combinations so customers cannot select them.
- **FR-012**: System MUST display a firm total price and an estimated delivery date to the customer before requesting payment.

#### Order, Payment & Fulfillment
- **FR-013**: System MUST require account creation (or guest checkout with email) before payment in order to attach the order to a contactable customer.
- **FR-014**: System MUST collect payment in full before the order enters production.
- **FR-015**: System MUST validate the shipping address before fulfillment begins and surface invalid-address errors to the customer for correction.
- **FR-016**: System MUST notify the customer at each major fulfillment milestone (order received, in production, shipped with tracking, delivered) via their chosen contact channel.
- **FR-017**: System MUST detect print failures and automatically schedule a reprint at no additional cost to the customer, with an updated delivery estimate.
- **FR-018**: System MUST provide a defined return or reprint path for delivered orders that materially do not match the approved preview, with clear eligibility rules visible to the customer before purchase.

#### Operations & Trust
- **FR-019**: System MUST log every generated model, every approval, and every fulfillment event against the order so the business can investigate disputes.
- **FR-020**: System MUST present pricing, delivery estimates, regeneration limits, return policy, and prohibited-content rules to the customer before they commit to payment, in plain language.

### Key Entities

- **Customer**: An individual or organization placing orders. Holds contact information, shipping addresses, payment instrument(s), and an order history. May be authenticated or operating as a guest at generation time but is identified before payment.
- **Generation Job**: A single attempt to produce a 3D model from one input (text or image). Records the input, the resulting model, the time taken, and the outcome (success, refusal with reason, or failure).
- **Model**: A previewable, potentially printable 3D representation produced by a Generation Job. Holds geometry data, the print-readiness verdict for each candidate material, and links back to its parent job.
- **Material**: A printable substance offered in the catalog (e.g., standard plastic, durable plastic, resin, flexible). Holds available colors, minimum wall thickness, price-per-volume parameters, lead-time parameters, current stock status, and a customer-facing description.
- **Order**: A customer's commitment to receive a physical print of a specific Model in a specific Material and color, at a stated price, to a stated address. Progresses through states (paid, in production, shipped, delivered, returned/reprinted).
- **Shipment**: The physical-delivery leg of an Order. Holds tracking information, carrier, dispatch and delivery dates.
- **Content Policy Decision**: A record attached to a Generation Job whenever the system refuses an input, capturing the rule that triggered the refusal so the customer can be told why and the business can audit decisions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 80% of first-time customers who start with a prompt successfully reach a previewable 3D model on their first attempt.
- **SC-002**: 80% of customers who reach a preview can place an order in 10 minutes or less from prompt entry.
- **SC-003**: 95% of approved models pass print-readiness validation without requiring customer-visible repair or regeneration.
- **SC-004**: 90% of orders are delivered within the delivery estimate shown to the customer at checkout.
- **SC-005**: Reprint/refund rate driven by "delivered object does not match preview" stays below 3% of delivered orders.
- **SC-006**: 90% of customers who complete an order rate the result satisfactory or better in a post-delivery survey.
- **SC-007**: Median time from prompt entry to first viewable preview is under 90 seconds at typical demand.
- **SC-008**: Fewer than 1% of orders are blocked at the address-validation step after payment (i.e., address issues are caught before money changes hands).

## Assumptions

- **Single-region launch**: The MVP serves a single country/region (default: United States). International shipping, customs, multi-currency pricing, and regional content rules are out of scope for v1.
- **In-house fulfillment**: Printing and shipping are performed by the platform operator (per the brief, "we handle the entire pipeline end-to-end"), not by third-party print partners. Outsourced fulfillment may be added later but is not in scope.
- **One-shot purchase, not subscription**: Customers pay per object. No memberships, no recurring billing.
- **Dynamic quote pricing**: Each order is priced from the model's print volume × material cost × overheads. No fixed catalog of pre-priced objects.
- **Bounded free regenerations**: Each generation session includes a small number of free regenerations (industry-typical: 3); additional regenerations may carry a charge surfaced before the customer commits to them.
- **Standard payment methods**: Credit/debit card and common digital wallets at checkout. No invoicing, no purchase orders, no crypto.
- **Standard delivery options**: A small set of shipping speeds (e.g., standard and expedited). No same-day or scheduled delivery in v1.
- **Account model**: Email + password, with guest checkout permitted (account auto-created at email submission). No SSO, no enterprise accounts in v1.
- **Content moderation policy**: Refusals cover copyrighted characters, registered trademarks, identifiable real persons without consent, weapons, and sexual content. The exact rule set is treated as a living policy maintained by the operator.
- **Browser support**: Current versions of mainstream desktop and mobile browsers. WebGL-capable devices are required for the 3D preview; non-capable devices see a fallback image carousel.
- **Preview persistence window**: Generated previews are retained for an in-progress customer for at least 7 days before being eligible for cleanup.
