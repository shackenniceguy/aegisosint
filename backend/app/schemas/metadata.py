from pydantic import BaseModel
from typing import Dict, Any, Optional, List

class GPSInfo(BaseModel):
    latitude: float
    longitude: float
    altitude: Optional[float] = None
    google_maps_url: str
    osm_url: str

class FileMetadataResponse(BaseModel):
    filename: str
    file_type: str
    file_size_bytes: int
    mime_type: str
    exif_data: Dict[str, Any] = {}
    gps_info: Optional[GPSInfo] = None
    document_properties: Dict[str, Any] = {}
    embedded_urls: List[str] = []
    has_sensitive_leaks: bool = False
    leak_warnings: List[str] = []

