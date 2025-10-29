import React from 'react';

import logo_default from '../assets/vcf/logo_large.png';
import logo_small from '../assets/vcf/logo_small.png';
import logo_large from '../assets/vcf/logo_large.png';

/**
 * Hook to centralize asset paths for logos and images
 *
 * @returns {Object} An object containing small, large, and rotating logo URLs
 */
export function useLogos() {
    const [logo_rotate, setLogoRotate] = React.useState<string | null>(null);

    // Preload images for faster rendering
    React.useEffect(() => {
        // Vite will statically analyze this path pattern at build time
        const images = import.meta.glob('../assets/vcf/logo_rotate.png', {
            eager: true,
            import: 'default',
        });

        setLogoRotate(images['../assets/vcf/logo_rotate.png'] as string || null);

        [logo_small, logo_large, logo_rotate].forEach(src => {
            if (typeof src === 'string') {
                const img = new Image();
                img.src = src;
            }
        });
    }, []);

    return { logo_default, logo_small, logo_large, logo_rotate };
}

export default useLogos;