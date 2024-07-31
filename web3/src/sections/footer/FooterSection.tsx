import { SocialIcon } from "react-social-icons";

const FooterSection = () => {
	return (
		<div className="h-fit w-full flex flex-col justify-center items-center">
			<p className="text-3xl">🍑</p>
			<p className="text-2xl">Peach Pod</p>
			<div className="flex w-full justify-center">
				<SocialIcon
					url="https://x.com/getpeachpod"
					bgColor="white"
					fgColor="black"
					target="_blank"
				/>
				<SocialIcon
					url="https://www.tiktok.com/@getpeachpod"
					bgColor="white"
					fgColor="black"
					target="_blank"
				/>
				<SocialIcon
					url="https://www.instagram.com/getpeachpod/"
					bgColor="white"
					fgColor="black"
					target="_blank"
				/>
				<SocialIcon
					url="https://www.youtube.com/channel/UCndcryZDk4p3t-8AzgIvYmQ"
					bgColor="white"
					fgColor="black"
					target="_blank"
				/>
			</div>
		</div>
	);
};

export default FooterSection;
