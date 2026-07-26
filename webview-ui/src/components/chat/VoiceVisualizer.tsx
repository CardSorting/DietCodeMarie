import React from "react"
import { cn } from "@/lib/utils"

interface VoiceVisualizerProps {
	/** Whether the microphone is actively capturing audio */
	isActive?: boolean
	/** Custom class names for container */
	className?: string
}

/**
 * Animated 5-bar equalizer audio waveform visualizer.
 * Provides live visual feedback when microphone is active.
 */
export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ isActive = true, className }) => {
	const bars = [
		{ delay: "0ms", height: "h-3", activeHeight: "animate-[pulse_0.6s_ease-in-out_infinite]" },
		{ delay: "150ms", height: "h-5", activeHeight: "animate-[pulse_0.8s_ease-in-out_infinite_100ms]" },
		{ delay: "300ms", height: "h-4", activeHeight: "animate-[pulse_0.5s_ease-in-out_infinite_200ms]" },
		{ delay: "450ms", height: "h-6", activeHeight: "animate-[pulse_0.7s_ease-in-out_infinite_150ms]" },
		{ delay: "200ms", height: "h-3.5", activeHeight: "animate-[pulse_0.65s_ease-in-out_infinite_300ms]" },
	]

	return (
		<div className={cn("flex items-center gap-0.5 px-1 py-0.5 select-none", className)} data-testid="voice-visualizer">
			{bars.map((bar) => (
				<span
					className={cn(
						"w-0.75 rounded-full transition-all duration-300",
						isActive ? "bg-red-400" : "bg-muted-foreground/40",
						bar.height,
						isActive && bar.activeHeight,
					)}
					key={bar.delay}
					style={{ animationDelay: bar.delay }}
				/>
			))}
		</div>
	)
}
