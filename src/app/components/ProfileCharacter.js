'use client'

import { useEffect, useRef } from 'react'
import { defaultCharacterDrawing } from './character'

export default function ProfileCharacter({ 
  profileStyle, 
  size = 150,
  onClick,
  className = ''
}) {
  const containerRef = useRef(null);

  // 색상 리스트 정의
  const colorList = [
    "#FFFF00", "#B2F632", "#62EC68", "#38F3FF", "#64C1FF",
    "#569AFF", "#5F6BFF", "#B68FFF", "#A126FF", "#F65AFF",
    "#FF8FCC", "#FFA51F", "#FF4A1F"
  ]

  const drawCharacter = () => {
    try {
      // profileStyle이 배열인지 확인
      const style = Array.isArray(profileStyle) ? profileStyle : [0, 0, 0, 0, 0]
      
      if (!containerRef.current) {
        console.error('Container ref is null');
        return;
      }

      defaultCharacterDrawing({
        imageSize: size,
        hairNo: style[0] || 0,
        faceNo: style[1] || 0,
        hairColor: colorList[style[2]] || colorList[0],
        faceColor: colorList[style[3]] || colorList[0],
        backgroundColor: colorList[style[4]] || colorList[3],
        element: containerRef.current
      })
    } catch (error) {
      console.error('캐릭터 그리기 오류:', error)
      // 오류 발생 시 기본값으로 그리기
      if (!containerRef.current) return;

      defaultCharacterDrawing({
        imageSize: size,
        hairNo: 0,
        faceNo: 0,
        hairColor: colorList[0],
        faceColor: colorList[0],
        backgroundColor: colorList[0],
        element: containerRef.current
      })
    }
  }

  useEffect(() => {
    drawCharacter()
    
    // 컴포넌트가 언마운트될 때 캔버스 정리
    return () => {
      if (containerRef.current) {
        const canvas = containerRef.current.querySelector('canvas');
        if (canvas) {
          canvas.remove();
        }
      }
    }
  }, [profileStyle, size])

  return (
    <div 
      ref={containerRef}
      className={className}
      style={{ width: size, height: size }}
      onClick={onClick}
    />
  )
} 