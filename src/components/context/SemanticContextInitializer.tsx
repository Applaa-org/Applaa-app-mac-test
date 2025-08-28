import { useEffect } from 'react';
import { useInitializeSemanticContext } from '../../hooks/useSemanticContext';
import log from 'electron-log';

const logger = log.scope('semantic_context_initializer');

/**
 * Component that initializes the semantic context system on app startup
 * This should be mounted early in the app lifecycle
 */
export function SemanticContextInitializer() {
  const initializeSemanticContext = useInitializeSemanticContext();

  useEffect(() => {
    // Initialize semantic context system on app startup
    const initialize = async () => {
      try {
        await initializeSemanticContext.mutateAsync();
        logger.info('Semantic context system initialized successfully');
      } catch (error) {
        logger.warn('Failed to initialize semantic context system:', error);
        // Don't throw - this is not critical for app functionality
      }
    };

    initialize();
  }, []); // Empty dependency array - only run once on mount

  // This component doesn't render anything
  return null;
}

