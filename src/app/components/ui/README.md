# BoothOS UI Components

Reusable UI components extracted from the BoothOS codebase.

## Components

### Button

A flexible button component with multiple variants and sizes.

```tsx
import { Button } from "@/app/components/ui";

// Primary button (default)
<Button onClick={handleClick}>Click me</Button>

// Secondary button
<Button variant="secondary">Cancel</Button>

// Danger button
<Button variant="danger">Delete</Button>

// Ghost button
<Button variant="ghost">Reset</Button>

// Small size
<Button size="sm">Small</Button>

// Loading state
<Button loading>Processing...</Button>

// Submit button
<Button type="submit">Submit Form</Button>
```

**Props:**
- `variant`: "primary" | "secondary" | "danger" | "ghost" (default: "primary")
- `size`: "sm" | "md" | "lg" (default: "md")
- `loading`: boolean (default: false)
- `disabled`: boolean (default: false)
- `type`: "button" | "submit" (default: "button")
- `onClick`: () => void
- `className`: string (additional classes)

### Alert

Display success, error, info, or warning messages.

```tsx
import { Alert } from "@/app/components/ui";

// Success message
<Alert type="success" message="Operation completed successfully!" />

// Error message
<Alert type="error" message="Something went wrong." />

// With dismiss button
<Alert
  type="info"
  message="This is an informational message"
  onDismiss={() => console.log("Dismissed")}
/>
```

**Props:**
- `type`: "success" | "error" | "info" | "warning"
- `message`: string | ReactNode
- `onDismiss?`: () => void (optional dismiss handler)
- `className?`: string (additional classes)

### Card

A consistent card container with BoothOS styling.

```tsx
import { Card } from "@/app/components/ui";

<Card>
  <h2>Card Title</h2>
  <p>Card content goes here</p>
</Card>

// With custom classes
<Card className="max-w-md">
  <p>Narrow card</p>
</Card>
```

**Props:**
- `children`: ReactNode
- `className?`: string (additional classes)

### FormInput

A styled form input with label, error handling, and consistent styling.

```tsx
import { FormInput } from "@/app/components/ui";

<FormInput
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="user@example.com"
  required
/>

// With error
<FormInput
  label="Password"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  error="Password must be at least 8 characters"
/>
```

**Props:**
- `label`: string
- `type?`: string (default: "text")
- `value`: string
- `onChange`: (e: React.ChangeEvent<HTMLInputElement>) => void
- `placeholder?`: string
- `error?`: string (error message to display)
- `required?`: boolean (default: false)
- `className?`: string (additional classes for input)
- `labelClassName?`: string (additional classes for label)

## Design Tokens

These components use CSS variables from the BoothOS design system:

- `--color-bg`: Background color
- `--color-text`: Primary text color
- `--color-text-muted`: Muted text color
- `--color-text-soft`: Soft text color
- `--color-surface`: Surface/card background
- `--color-surface-elevated`: Elevated surface
- `--color-border-subtle`: Subtle border color
- `--gradient-brand`: Brand gradient
- `--color-text-on-primary`: Text color on primary buttons
- `--color-success-soft`: Success message background
- `--color-danger-soft`: Error message background
- `--input-bg`: Input background
- `--input-placeholder`: Input placeholder color
- `--input-border-focus`: Input border on focus
- `--shadow-soft`: Soft shadow

## Usage Example

Here's a complete form using all components:

```tsx
"use client";

import { useState } from "react";
import { Button, Alert, Card, FormInput } from "@/app/components/ui";

export default function ExampleForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Your form logic here
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      {error && <Alert type="error" message={error} onDismiss={() => setError(null)} />}
      {success && <Alert type="success" message="Form submitted successfully!" />}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
          />

          <FormInput
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
          />

          <div className="flex gap-3">
            <Button type="submit" loading={loading}>
              Submit
            </Button>
            <Button variant="secondary" type="button">
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
```
