#!/usr/bin/env node
/**
 * Loop Workflow Example - Iterative Refinement Pattern
 *
 * Demonstrates iterative workflows where an agent repeatedly processes and refines
 * output until a condition is met. This is useful for:
 * - Iterative improvement
 * - Quality checking and refinement
 * - Convergence-based processes
 *
 * Pattern:
 * Input -> Agent -> Check -> (if not done) -> Agent -> Check -> ... -> Output
 *                    |
 *                    +-> (if done) -> Output
 */

import {
	query,
	type SDKAssistantMessage,
} from "@anthropic-ai/claude-agent-sdk";

async function generateContent(
	prompt: string,
	iteration: number,
): Promise<string> {
	/**
	 * Content generator agent creates or refines content.
	 */
	console.log(`\n[Iteration ${iteration}] Generating content...`);

	let result = "";

	for await (const message of query({
		prompt,
		options: {
			systemPrompt:
				"You are a content creator. Generate clear, engaging content based on the requirements provided.",
			model: "sonnet",
		},
	})) {
		if (message.type === "assistant") {
			const assistantMsg = message as SDKAssistantMessage;
			for (const block of assistantMsg.message.content) {
				if (block.type === "text") {
					result += block.text;
				}
			}
		}
	}

	console.log(
		`[Iteration ${iteration}] Content generated (${result.length} chars)`,
	);
	return result;
}

async function evaluateQuality(
	content: string,
	requirements: string,
	iteration: number,
): Promise<[boolean, string, number]> {
	/**
	 * Quality evaluator agent checks if content meets requirements.
	 *
	 * Returns: Tuple of (is_acceptable, feedback, score)
	 */
	console.log(`[Iteration ${iteration}] Evaluating quality...`);

	const evalPrompt = `
Evaluate this content against the requirements:

Requirements:
${requirements}

Content:
${content}

Provide a quality score (0-100) and determine if it's acceptable (score >= 80).
`;

	let result = "";

	for await (const message of query({
		prompt: evalPrompt,
		options: {
			systemPrompt: `You are a quality evaluator. Assess content against requirements.

Format your response EXACTLY as:
SCORE: <number 0-100>
ACCEPTABLE: <YES or NO>
FEEDBACK: <detailed feedback>`,
			model: "sonnet",
		},
	})) {
		if (message.type === "assistant") {
			const assistantMsg = message as SDKAssistantMessage;
			for (const block of assistantMsg.message.content) {
				if (block.type === "text") {
					result += block.text;
				}
			}
		}
	}

	// Parse evaluation result
	const scoreMatch = result.match(/SCORE:\s*(\d+)/);
	const acceptableMatch = result.match(/ACCEPTABLE:\s*(YES|NO)/i);
	const feedbackMatch = result.match(/FEEDBACK:\s*(.+)/s);

	const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
	const acceptable = acceptableMatch
		? acceptableMatch[1].toUpperCase() === "YES"
		: false;
	const feedback = feedbackMatch
		? feedbackMatch[1].trim()
		: "No feedback provided";

	console.log(
		`[Iteration ${iteration}] Quality Score: ${score}/100 - ${acceptable ? "ACCEPTABLE" : "NEEDS IMPROVEMENT"}`,
	);

	return [acceptable, feedback, score];
}

async function refineContent(
	content: string,
	feedback: string,
	iteration: number,
): Promise<string> {
	/**
	 * Refinement agent improves content based on feedback.
	 */
	console.log(`[Iteration ${iteration}] Refining content based on feedback...`);

	const refinePrompt = `
Improve this content based on the feedback:

Current Content:
${content}

Feedback:
${feedback}

Provide the refined version.
`;

	let result = "";

	for await (const message of query({
		prompt: refinePrompt,
		options: {
			systemPrompt:
				"You are a content refiner. Improve content based on specific feedback while maintaining core message.",
			model: "sonnet",
		},
	})) {
		if (message.type === "assistant") {
			const assistantMsg = message as SDKAssistantMessage;
			for (const block of assistantMsg.message.content) {
				if (block.type === "text") {
					result += block.text;
				}
			}
		}
	}

	console.log(`[Iteration ${iteration}] Content refined`);
	return result;
}

async function loopWorkflowIterativeRefinement(
	initialPrompt: string,
	requirements: string,
	maxIterations: number = 5,
): Promise<[string, number, number]> {
	/**
	 * Loop workflow: Iteratively generate and refine content until quality threshold is met.
	 *
	 * Flow:
	 * 1. Generate initial content
	 * 2. Loop:
	 *    a. Evaluate content quality
	 *    b. If acceptable, exit loop
	 *    c. Otherwise, get refinement feedback
	 *    d. Refine content
	 *    e. Repeat (up to max_iterations)
	 * 3. Return final content
	 */

	console.log("=".repeat(60));
	console.log("LOOP WORKFLOW: Iterative Content Refinement");
	console.log("=".repeat(60));
	console.log(`\nInitial Prompt: ${initialPrompt}`);
	console.log(`Requirements: ${requirements}`);
	console.log(`Max Iterations: ${maxIterations}\n`);
	console.log("-".repeat(60));

	// Generate initial content
	let content = await generateContent(initialPrompt, 1);

	let iteration = 1;
	let acceptable = false;
	let finalScore = 0;

	// Iterative refinement loop
	while (iteration <= maxIterations && !acceptable) {
		// Evaluate current content
		const [isAcceptable, feedback, score] = await evaluateQuality(
			content,
			requirements,
			iteration,
		);
		acceptable = isAcceptable;
		finalScore = score;

		if (acceptable) {
			console.log(
				`\n[Iteration ${iteration}] Quality threshold met! Exiting loop.`,
			);
			break;
		}

		if (iteration === maxIterations) {
			console.log(
				`\n[Iteration ${iteration}] Max iterations reached. Using best available content.`,
			);
			break;
		}

		// Refine content based on feedback
		content = await refineContent(content, feedback, iteration);
		iteration++;
	}

	// Display final result
	console.log("\n" + "=".repeat(60));
	console.log("FINAL RESULT");
	console.log("=".repeat(60));
	console.log(`\nIterations: ${iteration}`);
	console.log(`Final Score: ${finalScore}/100`);
	console.log(`Status: ${acceptable ? "ACCEPTABLE" : "NEEDS MORE WORK"}`);
	console.log(`\nFinal Content:\n`);
	console.log("-".repeat(60));
	console.log(content);
	console.log("-".repeat(60));

	return [content, iteration, finalScore];
}

async function loopWorkflowConvergence() {
	/**
	 * Alternative loop pattern: Continue until convergence (changes become minimal).
	 */

	console.log("\n\n" + "=".repeat(60));
	console.log("LOOP WORKFLOW: Convergence-Based Processing");
	console.log("=".repeat(60));

	const initialValue = 100;
	const target = 10;
	const tolerance = 0.1;

	console.log(`\nStarting value: ${initialValue}`);
	console.log(`Target: ${target}`);
	console.log(`Tolerance: ${tolerance}\n`);
	console.log("-".repeat(60));

	let currentValue = initialValue;
	let iteration = 1;
	const maxIterations = 20;

	while (iteration <= maxIterations) {
		// Process iteration
		let result = "";

		for await (const message of query({
			prompt: `Current value: ${currentValue}, Target: ${target}. Calculate next iteration.`,
			options: {
				systemPrompt:
					"You are a mathematical processor. Calculate the next iteration value using the formula: new_value = (current_value + target) / 2. Respond with ONLY the number.",
				model: "sonnet",
			},
		})) {
			if (message.type === "assistant") {
				const assistantMsg = message as SDKAssistantMessage;
				for (const block of assistantMsg.message.content) {
					if (block.type === "text") {
						result += block.text;
					}
				}
			}
		}

		// Extract numeric value
		let nextValue: number;
		try {
			const match = result.match(/-?\d+\.?\d*/);
			nextValue = match ? parseFloat(match[0]) : (currentValue + target) / 2;
		} catch {
			// Fallback to manual calculation if parsing fails
			nextValue = (currentValue + target) / 2;
		}

		const change = Math.abs(nextValue - currentValue);

		console.log(
			`[Iteration ${iteration}] Value: ${nextValue.toFixed(4)}, Change: ${change.toFixed(4)}`,
		);

		// Check convergence
		if (change < tolerance) {
			console.log(
				`\n[Iteration ${iteration}] Convergence achieved! Change (${change.toFixed(4)}) < Tolerance (${tolerance})`,
			);
			break;
		}

		currentValue = nextValue;
		iteration++;

		if (iteration > maxIterations) {
			console.log(`\n[Iteration ${iteration}] Max iterations reached.`);
		}
	}

	console.log("\n" + "=".repeat(60));
	console.log(`Final converged value: ${currentValue.toFixed(4)}`);
	console.log(`Total iterations: ${iteration}`);
	console.log("=".repeat(60));
}

async function demonstrateLoopWorkflows() {
	/**
	 * Demonstrate both loop workflow patterns.
	 */

	// Pattern 1: Iterative refinement with quality checks
	await loopWorkflowIterativeRefinement(
		"Write a brief introduction to machine learning for beginners",
		`
- Must be under 150 words
- Use simple, non-technical language
- Include at least one real-world example
- Be engaging and clear
`,
		5,
	);

	// Pattern 2: Convergence-based loop
	await loopWorkflowConvergence();
}

async function main() {
	await demonstrateLoopWorkflows();

	console.log("\n=== Loop Workflow Summary ===");
	console.log("✓ Iterative refinement");
	console.log("✓ Quality evaluation loops");
	console.log("✓ Convergence-based processing");
	console.log("✓ Adaptive iteration limits");
}

main().catch(console.error);
