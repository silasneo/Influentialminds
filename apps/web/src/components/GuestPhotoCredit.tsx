import * as React from "react";
import portraits from "../../public/assets/guests/credits.json";

interface Props {
  headshotUrl: string | null;
  linked?: boolean;
}

export function GuestPhotoCredit({ headshotUrl, linked = false }: Props) {
  const credit = portraits.find(portrait => portrait.url === headshotUrl);
  if (!credit) return null;

  return (
    <small
      style={{
        display: "block",
        fontSize: 10,
        lineHeight: 1.5,
        marginTop: 8,
      }}
    >
      Photo:{" "}
      {linked ? (
        <a href={credit.source} target="_blank" rel="noreferrer noopener">
          {credit.author}
        </a>
      ) : (
        credit.author
      )}
      {" · "}
      {linked ? (
        <a href={credit.licenseUrl} target="_blank" rel="noreferrer noopener">
          {credit.license}
        </a>
      ) : (
        credit.license
      )}
      . {credit.changes}
    </small>
  );
}
