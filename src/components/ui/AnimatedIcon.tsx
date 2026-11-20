import type { ReactElement } from 'react'
import UseAnimations, { type Animation, type EventProps, type Interaction } from 'react-useanimations'
import clsx from 'clsx'

// react-useanimations injects a <style id="useanimations-styles"> at runtime,
// which our production CSP (style-src 'self', no 'unsafe-inline') blocks. The
// same rules ship in src/index.css instead; this marker makes the library skip
// its injection.
const STYLE_MARKER_ID = 'useanimations-styles'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_MARKER_ID)) {
  const marker = document.createElement('meta')
  marker.id = STYLE_MARKER_ID
  marker.name = 'useanimations-styles'
  marker.content = 'provided by src/index.css'
  document.head.append(marker)
}

type AnimatedIconProps = {
  animation: Animation
  size?: number
  interaction?: Interaction
  /** Announced name; omit for decorative icons (the default). */
  label?: string
  className?: string
  autoplay?: boolean
  loop?: boolean | number
  active?: boolean
  speed?: number
}

/** Decorative animated icon that follows the current text colour (theme tokens). */
export const AnimatedIcon = ({ animation, size = 18, interaction, label, className, autoplay, loop, active, speed }: AnimatedIconProps) => (
  <UseAnimations
    animation={animation}
    size={size}
    interaction={interaction}
    autoplay={autoplay}
    loop={loop}
    active={active}
    speed={speed}
    aria-label={label}
    className={clsx('inline-flex shrink-0', className)}
  />
)

/**
 * Animates the icon when the *whole* control is hovered or focused, not just the
 * icon. `children` receives the event handlers for the interactive element and
 * the icon node to place inside it.
 */
export const AnimatedControl = ({ animation, size = 18, interaction = 'hover', children }: {
  animation: Animation
  size?: number
  interaction?: Interaction
  children: (eventProps: EventProps, icon: ReactElement) => ReactElement
}) => (
  <UseAnimations
    animation={animation}
    size={size}
    interaction={interaction}
    render={(eventProps, animationProps) => children(eventProps, <span {...animationProps} className={clsx('inline-flex shrink-0', animationProps.className)} />)}
  />
)
