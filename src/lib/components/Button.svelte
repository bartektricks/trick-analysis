<script module>
	export type ButtonVariants = {
		variant?: 'primary' | 'secondary' | 'tertiary';
		purpose?: 'default' | 'icon';
	};

	export const buttonStyleVariants = ({
		variant = 'primary',
		purpose = 'default'
	}: ButtonVariants | undefined = {}) =>
		cn(
			'bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-2 py-1 whitespace-nowrap shadow transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
			{
				'bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground':
					variant === 'primary',
				'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
				'bg-background border-input hover:bg-accent hover:text-accent-foreground':
					variant === 'tertiary',
				'px-1.5': purpose === 'icon'
			}
		);
</script>

<script lang="ts">
	import { cn } from '$lib/cn';
	import { Button, type ButtonRootProps } from 'bits-ui';

	type ButtonProps = ButtonRootProps & ButtonVariants;

	let {
		class: buttonClass,
		variant = 'primary',
		purpose = 'default',
		...props
	}: ButtonProps = $props();
</script>

<Button.Root {...props} class={cn(buttonStyleVariants({ variant, purpose }), buttonClass)} />
