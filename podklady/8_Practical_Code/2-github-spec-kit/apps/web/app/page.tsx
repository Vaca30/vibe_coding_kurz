import { PromptInput } from '~/components/prompt-input.tsx';

export default function HomePage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">
        Imagine it. We&rsquo;ll print it and ship it.
      </h1>
      <p className="mt-4 text-foreground/70 max-w-xl">
        Describe an object — or upload a photo — and we&rsquo;ll generate a 3D model in your
        browser. Approve it, pick a material, and the printed piece arrives at your door in days.
      </p>
      <div className="mt-10">
        <PromptInput />
      </div>
    </section>
  );
}
