"""
Image service for fetching educational images from Unsplash.
"""
import os
import requests
from typing import Optional, List, Dict

class ImageService:
    def __init__(self, access_key: Optional[str] = None):
        """Initialize the image service with Unsplash API key."""
        self.access_key = access_key or os.getenv('UNSPLASH_ACCESS_KEY')
        self.base_url = "https://api.unsplash.com"
        self.enabled = bool(self.access_key and self.access_key != 'your-unsplash-key-here')
    
    def search_image(self, query: str, count: int = 1) -> List[Dict]:
        """
        Search for images on Unsplash.
        
        Args:
            query: Search term (e.g., "elephant", "grammar book")
            count: Number of images to return (default 1)
        
        Returns:
            List of image dictionaries with url, description, photographer info
        """
        if not self.enabled:
            return []
        
        try:
            url = f"{self.base_url}/search/photos"
            params = {
                'query': query,
                'per_page': count,
                'orientation': 'landscape',
                'content_filter': 'high',  # Family-friendly content
                'client_id': self.access_key
            }
            
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            results = []
            
            for photo in data.get('results', []):
                results.append({
                    'url': photo['urls']['regular'],
                    'thumb_url': photo['urls']['thumb'],
                    'description': photo.get('description') or photo.get('alt_description') or query,
                    'photographer': photo['user']['name'],
                    'photographer_url': photo['user']['links']['html'],
                    'download_location': photo['links']['download_location']
                })
            
            return results
            
        except Exception as e:
            print(f"Error fetching images from Unsplash: {e}")
            return []
    
    def get_image_for_word(self, word: str) -> Optional[Dict]:
        """
        Get a single image for a vocabulary word.
        
        Args:
            word: The vocabulary word
        
        Returns:
            Image dictionary or None if not found
        """
        results = self.search_image(word, count=1)
        return results[0] if results else None
    
    def get_images_for_lesson(self, skill: str, key_concepts: List[str]) -> Dict[str, Dict]:
        """
        Get images for key concepts in a lesson.
        
        Args:
            skill: The skill name (e.g., "vocabulary")
            key_concepts: List of key concepts to find images for
        
        Returns:
            Dictionary mapping concepts to image data
        """
        if not self.enabled:
            return {}
        
        images = {}
        
        # Get a general image for the skill
        skill_image = self.search_image(f"{skill} education", count=1)
        if skill_image:
            images['_header'] = skill_image[0]
        
        # Get images for key concepts (limit to avoid rate limits)
        for concept in key_concepts[:3]:  # Max 3 concept images
            concept_images = self.search_image(concept, count=1)
            if concept_images:
                images[concept] = concept_images[0]
        
        return images
    
    def format_image_markdown(self, image_data: Dict, alt_text: str = None) -> str:
        """
        Format image data as markdown with attribution.
        
        Args:
            image_data: Image dictionary from search_image
            alt_text: Alternative text for the image
        
        Returns:
            Markdown string with image and attribution
        """
        if not image_data:
            return ""
        
        alt = alt_text or image_data.get('description', 'Image')
        url = image_data.get('url', '')
        photographer = image_data.get('photographer', 'Unknown')
        photographer_url = image_data.get('photographer_url', '#')
        
        markdown = f"![{alt}]({url})\n\n"
        markdown += f"*Photo by [{photographer}]({photographer_url}) on [Unsplash](https://unsplash.com)*\n\n"
        
        return markdown
    
    def trigger_download(self, download_location: str):
        """
        Trigger download tracking for Unsplash (required by API guidelines).
        
        Args:
            download_location: The download_location URL from image data
        """
        if not self.enabled or not download_location:
            return
        
        try:
            requests.get(
                download_location,
                params={'client_id': self.access_key},
                timeout=2
            )
        except:
            pass  # Non-critical, just for tracking


# Singleton instance
_image_service_instance = None

def get_image_service() -> ImageService:
    """Get or create the image service instance."""
    global _image_service_instance
    if _image_service_instance is None:
        _image_service_instance = ImageService()
    return _image_service_instance
