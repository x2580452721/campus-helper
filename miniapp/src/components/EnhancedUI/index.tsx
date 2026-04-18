import { View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import React, { useEffect, useState } from 'react';

interface AnimatedBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
  theme?: 'blue' | 'pink' | 'green' | 'orange' | 'purple' | 'rainbow';
}

export const AnimatedBackground = ({
  children,
  className = '',
  intensity = 'medium',
  theme = 'blue'
}: AnimatedBackgroundProps) => {
  const themeColors = {
    blue: ['#06b6d4', '#3b82f6', '#1e40af'],
    pink: ['#f43f5e', '#ec4899', '#be123c'],
    green: ['#10b981', '#059669', '#047857'],
    orange: ['#f59e0b', '#ea580c', '#c2410c'],
    purple: ['#8b5cf6', '#7c3aed', '#5b21b6'],
    rainbow: ['#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6']
  };

  const colors = themeColors[theme];
  const opacityMap = { low: 0.08, medium: 0.12, high: 0.18 };
  const opacity = opacityMap[intensity];

  return (
    <View className={`animated-bg-container ${className}`}>
      {colors.map((color, i) => (
        <View
          key={i}
          className={`animated-orb orb-${i + 1}`}
          style={{
            background: `radial-gradient(circle, ${color}40 0%, transparent 70%)`,
            animationDelay: `${i * 1.5}s`
          }}
        />
      ))}
      <View className="animated-content">
        {children}
      </View>
    </View>
  );
};

interface FloatingElementProps {
  children?: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  amplitude?: number;
}

export const FloatingElement = ({
  children,
  className = '',
  delay = 0,
  duration = 4,
  amplitude = 10
}: FloatingElementProps) => {
  return (
    <View
      className={`floating-element ${className}`}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
        '--float-amplitude': `${amplitude}px`
      }}
    >
      {children}
    </View>
  );
};

interface GlowButtonProps {
  children?: React.ReactNode;
  className?: string;
  color?: string;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const GlowButton = ({
  children,
  className = '',
  color = '#06b6d4',
  onClick,
  disabled = false,
  size = 'medium'
}: GlowButtonProps) => {
  const sizeStyles = {
    small: { padding: '12px 24px', fontSize: '24px', borderRadius: '20px' },
    medium: { padding: '16px 32px', fontSize: '28px', borderRadius: '24px' },
    large: { padding: '20px 40px', fontSize: '32px', borderRadius: '28px' }
  };

  const style = sizeStyles[size];

  return (
    <View
      className={`glow-button ${className} ${disabled ? 'disabled' : ''}`}
      style={{
        background: `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`,
        boxShadow: `0 8px 32px ${color}50, 0 4px 16px ${color}30`,
        ...style
      }}
      onClick={!disabled ? onClick : undefined}
    >
      <View className="glow-button-inner">
        {children}
      </View>
    </View>
  );
};

interface GlassCardProps {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  glow?: boolean;
  glowColor?: string;
}

export const GlassCard = ({
  children,
  className = '',
  onClick,
  glow = false,
  glowColor = '#06b6d4'
}: GlassCardProps) => {
  return (
    <View
      className={`glass-card ${className} ${glow ? 'glowing' : ''}`}
      style={glow ? { boxShadow: `0 8px 32px ${glowColor}30` } : {}}
      onClick={onClick}
    >
      {children}
    </View>
  );
};

interface GradientTextProps {
  children?: React.ReactNode;
  className?: string;
  gradient?: string;
  size?: number;
  weight?: number;
}

export const GradientText = ({
  children,
  className = '',
  gradient = 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #10b981 100%)',
  size = 32,
  weight = 700
}: GradientTextProps) => {
  return (
    <View
      className={`gradient-text ${className}`}
      style={{
        background: gradient,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontSize: `${size}px`,
        fontWeight: weight
      }}
    >
      {children}
    </View>
  );
};

interface SparklesProps {
  count?: number;
  className?: string;
  color?: string;
}

export const Sparkles = ({
  count = 8,
  className = '',
  color = '#ffd700'
}: SparklesProps) => {
  const [particles, setParticles] = useState<Array<{ id: number; delay: number; size: number; top: number; left: number }>>([]);

  useEffect(() => {
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      delay: Math.random() * 3,
      size: 8 + Math.random() * 12,
      top: Math.random() * 100,
      left: Math.random() * 100
    }));
    setParticles(newParticles);
  }, [count]);

  return (
    <View className={`sparkles-container ${className}`}>
      {particles.map((p) => (
        <View
          key={p.id}
          className="sparkle"
          style={{
            animationDelay: `${p.delay}s`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            top: `${p.top}%`,
            left: `${p.left}%`,
            background: `radial-gradient(circle, ${color} 0%, transparent 70%)`
          }}
        />
      ))}
    </View>
  );
};

interface PulseRingProps {
  className?: string;
  color?: string;
  count?: number;
}

export const PulseRing = ({
  className = '',
  color = '#06b6d4',
  count = 3
}: PulseRingProps) => {
  return (
    <View className={`pulse-ring-container ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          className="pulse-ring"
          style={{
            borderColor: color,
            animationDelay: `${i * 0.6}s`
          }}
        />
      ))}
    </View>
  );
};

function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  r = Math.max(Math.min(255, r), 0);
  g = Math.max(Math.min(255, g), 0);
  b = Math.max(Math.min(255, b), 0);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export default {
  AnimatedBackground,
  FloatingElement,
  GlowButton,
  GlassCard,
  GradientText,
  Sparkles,
  PulseRing
};