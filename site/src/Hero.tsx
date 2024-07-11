export const Hero = () => {
  return (
    <div className="relative h-fit w-full">
      <img src={"/other.gif"} alt="Background image" className="h-full w-full object-cover"/>
      <div
        className="absolute top-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center w-max"
      >
        <p className="text-peach text-4xl font-medium font-pacifico mb-2">Peach Pod</p>
        <p className="text-white text-2xl mb-4">Your new home device.</p>
      </div>
    </div>
  )
}