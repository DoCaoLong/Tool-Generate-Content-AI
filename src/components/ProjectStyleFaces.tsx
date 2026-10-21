import PromptAvatar from "@/components/PromptAvatar";

export function ProjectStyleFaces({
  userSrc,
  userName,
  projectSrc,
  projectName,
  distinct,
  className,
  userClassName,
  projectClassName,
}: {
  userSrc?: string | null;
  userName: string;
  projectSrc?: string | null;
  projectName: string;
  distinct: boolean;
  className: string;
  userClassName: string;
  projectClassName: string;
}) {
  if (!distinct) {
    return <PromptAvatar src={userSrc || projectSrc} name={userName || projectName} className={`${className} ${userSrc || !projectSrc ? userClassName : projectClassName}`} />;
  }
  return (
    <span className="flex shrink-0 items-center">
      <PromptAvatar src={userSrc} name={userName} className={`relative z-10 ${className} ${userClassName}`} />
      <PromptAvatar src={projectSrc} name={projectName} className={`relative -ml-2 ring-2 ring-white ${className} ${projectClassName}`} />
    </span>
  );
}
