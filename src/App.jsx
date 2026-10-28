<div className="relative">
  <ImageSlider 
    images={itemImgs} 
    heightClass="h-40 md:h-48" 
    onCardClick={() => handleCardClick(item)} 
  />
  {item.is_urgent && (
    <span className="absolute top-2.5 left-2.5 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md shadow-md z-10 animate-pulse">
      🚨 URGENT
    </span>
  )}
  <span className="absolute top-2.5 right-16 bg-black/75 text-white text-[10px] px-2 py-0.5 rounded-md font-medium z-10">{item.category}</span>
  <span className={`absolute top-2.5 right-2.5 text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm z-10 ${isNeg ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'}`}>
    {isNeg ? 'Negotiable' : 'Fixed'}
  </span>
  ...
