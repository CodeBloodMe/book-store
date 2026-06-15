import {
  Rocket, Sparkles, Heart, Search, Ghost, BookOpen, User,
  Lightbulb, ShieldAlert, Cpu, Leaf, Globe, FlaskConical,
  Scale, Briefcase, Glasses, BookText, Swords, Palette,
  Camera, Music, MonitorPlay
} from 'lucide-react';

export function getGenreIcon(slug: string, className?: string) {
  const props = { className: className || "w-5 h-5" };

  switch (slug) {
    case 'science-fiction': return <Rocket {...props} />;
    case 'fantasy': return <Sparkles {...props} />;
    case 'romance': return <Heart {...props} />;
    case 'mystery':
    case 'mystery-thriller': return <Search {...props} />;
    case 'horror': return <Ghost {...props} />;
    case 'thriller': return <ShieldAlert {...props} />;
    case 'technology':
    case 'programming': return <Cpu {...props} />;
    case 'nature':
    case 'biology': return <Leaf {...props} />;
    case 'history':
    case 'historical-fiction': return <Globe {...props} />;
    case 'science': return <FlaskConical {...props} />;
    case 'philosophy': return <Scale {...props} />;
    case 'business':
    case 'economics':
    case 'finance-investing': return <Briefcase {...props} />;
    case 'biography':
    case 'memoir': return <User {...props} />;
    case 'self-help':
    case 'productivity-habits': return <Lightbulb {...props} />;
    case 'fiction':
    case 'literary-fiction': return <BookOpen {...props} />;
    case 'graphic-novels':
    case 'art-design': return <Palette {...props} />;
    case 'action-adventure': return <Swords {...props} />;
    case 'photography': return <Camera {...props} />;
    case 'music': return <Music {...props} />;
    case 'film-tv': return <MonitorPlay {...props} />;
    default: return <BookText {...props} />;
  }
}
