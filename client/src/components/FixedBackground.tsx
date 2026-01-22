/**
 * Global fixed background component
 * Must be placed at root level (in App.tsx) to avoid isolation context issues
 */
export default function FixedBackground() {
  return (
    <>
      {/* Fixed background image - TRULY fixed to viewport */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -10,
          overflow: 'hidden',
          pointerEvents: 'none'
        }}
      >
        <img 
          src="/container-terminal-bg.jpg" 
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
            opacity: 0.5
          }}
        />
      </div>
      
      {/* Backdrop blur layer */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backdropFilter: 'blur(1px)',
          WebkitBackdropFilter: 'blur(1px)',
          zIndex: -9,
          pointerEvents: 'none'
        }}
      />
    </>
  );
}
