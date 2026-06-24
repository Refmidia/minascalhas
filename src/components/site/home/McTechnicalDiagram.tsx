export function McTechnicalDiagram() {
  return (
    <div className="mc-tech-diagram" aria-hidden="true">
      <svg viewBox="0 0 520 340" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="mc-tech-bricks" width="18" height="10" patternUnits="userSpaceOnUse">
            <rect width="18" height="10" fill="#ececec" />
            <path d="M0 5 H18 M9 0 V10" stroke="#d8d8d8" strokeWidth="0.8" />
          </pattern>
          <pattern id="mc-tech-tiles" width="24" height="14" patternUnits="userSpaceOnUse">
            <rect width="24" height="14" fill="#e8e8e8" />
            <path d="M0 7 H24 M12 0 V14" stroke="#d2d2d2" strokeWidth="0.7" />
          </pattern>
          <linearGradient id="mc-tech-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4f4f4" />
            <stop offset="100%" stopColor="#c8c8c8" />
          </linearGradient>
        </defs>

        {/* Parede */}
        <rect x="300" y="72" width="200" height="248" fill="url(#mc-tech-bricks)" />
        <rect x="300" y="72" width="200" height="248" fill="rgba(0,0,0,0.03)" />

        {/* Telhado */}
        <path d="M24 118 L168 72 L292 118 V152 H24 Z" fill="url(#mc-tech-tiles)" stroke="#bdbdbd" strokeWidth="1.2" />
        <path d="M24 118 L168 72 L292 118" stroke="#a8a8a8" strokeWidth="1.5" fill="none" />

        {/* Rufo */}
        <path
          d="M248 118 L292 118 L286 132 L244 132 Z"
          fill="url(#mc-tech-metal)"
          stroke="#9a9a9a"
          strokeWidth="1"
        />

        {/* Calha — vista em corte */}
        <path
          d="M118 152 H286 C286 152 278 168 260 172 C242 176 214 176 196 172 C178 168 170 158 170 152 H118 Z"
          fill="url(#mc-tech-metal)"
          stroke="#8f8f8f"
          strokeWidth="1.2"
        />
        <path d="M118 152 H286" stroke="#777" strokeWidth="1.5" />
        <path d="M170 152 V168 C182 174 222 174 234 168 V152" stroke="#888" strokeWidth="1" fill="none" />

        {/* Detalhe ampliado da calha */}
        <rect x="72" y="188" width="132" height="92" rx="6" fill="#fafafa" stroke="#d5d5d5" strokeWidth="1" />
        <path
          d="M88 248 H188 C188 248 182 262 168 266 C154 270 122 270 108 266 C94 262 88 252 88 248 Z"
          fill="url(#mc-tech-metal)"
          stroke="#8f8f8f"
          strokeWidth="1.2"
        />
        <path d="M88 248 H188" stroke="#777" strokeWidth="1.3" />
        <path d="M108 248 V260 C118 264 158 264 168 260 V248" stroke="#888" strokeWidth="0.9" fill="none" />
        <path d="M72 240 H204" stroke="#e0e0e0" strokeWidth="1" strokeDasharray="4 3" />

        {/* Condutor */}
        <rect x="332" y="152" width="22" height="168" rx="3" fill="url(#mc-tech-metal)" stroke="#8f8f8f" strokeWidth="1" />
        <rect x="338" y="168" width="10" height="12" rx="1" fill="#b0b0b0" />
        <rect x="338" y="210" width="10" height="12" rx="1" fill="#b0b0b0" />
        <path d="M343 320 V332 H352 V320" stroke="#888" strokeWidth="2" fill="none" />

        {/* Suporte na parede */}
        <path d="M354 196 H372 V204 H360 V214 H354 Z" fill="#b8b8b8" stroke="#888" strokeWidth="0.8" />
        <path d="M354 248 H372 V256 H360 V266 H354 Z" fill="#b8b8b8" stroke="#888" strokeWidth="0.8" />

        {/* Linhas de chamada */}
        <path
          d="M92 86 L118 104"
          stroke="#f5b400"
          strokeWidth="1.2"
          strokeDasharray="3 3"
          strokeLinecap="round"
        />
        <path
          d="M198 58 L168 78"
          stroke="#f5b400"
          strokeWidth="1.2"
          strokeDasharray="3 3"
          strokeLinecap="round"
        />
        <path
          d="M408 248 L372 236"
          stroke="#f5b400"
          strokeWidth="1.2"
          strokeDasharray="3 3"
          strokeLinecap="round"
        />

        {/* Marcadores numerados */}
        <g>
          <circle cx="82" cy="78" r="15" fill="#f5b400" />
          <text x="82" y="83" textAnchor="middle" fill="#1b1b1b" fontSize="13" fontWeight="700">
            1
          </text>
        </g>
        <g>
          <circle cx="206" cy="50" r="15" fill="#f5b400" />
          <text x="206" y="55" textAnchor="middle" fill="#1b1b1b" fontSize="13" fontWeight="700">
            2
          </text>
        </g>
        <g>
          <circle cx="418" cy="256" r="15" fill="#f5b400" />
          <text x="418" y="261" textAnchor="middle" fill="#1b1b1b" fontSize="13" fontWeight="700">
            4
          </text>
        </g>
      </svg>
    </div>
  );
}
