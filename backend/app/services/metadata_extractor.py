import io
import re
from typing import Dict, Any, Tuple, Optional, List
from PIL import Image, ExifTags
import pypdf
import docx
from app.schemas.metadata import FileMetadataResponse, GPSInfo

class MetadataExtractorService:
    def _convert_to_degrees(self, value) -> float:
        """Helper function to convert the GPS coordinates stored in the EXIF to degress in float format"""
        if isinstance(value, (int, float)):
            return float(value)
        
        # Handle rational tuple / IFDRational (d, m, s)
        try:
            d = float(value[0])
            m = float(value[1])
            s = float(value[2])
            return d + (m / 60.0) + (s / 3600.0)
        except Exception:
            return 0.0

    def extract_image_exif(self, file_bytes: bytes) -> Tuple[Dict[str, Any], Optional[GPSInfo], List[str]]:
        exif_data = {}
        gps_info = None
        leak_warnings = []

        try:
            image = Image.open(io.BytesIO(file_bytes))
            raw_exif = image.getexif()

            if raw_exif:
                for tag_id, value in raw_exif.items():
                    tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                    # Convert bytes to string if needed
                    if isinstance(value, bytes):
                        try:
                            value = value.decode(errors="ignore")
                        except Exception:
                            value = str(value)
                    exif_data[tag_name] = str(value)

                # Check GPS SubIFD (tag 0x8825 = 34853)
                gps_ifd = raw_exif.get_ifd(0x8825)
                if gps_ifd:
                    gps_tags = {}
                    for g_tag_id, g_val in gps_ifd.items():
                        g_name = ExifTags.GPSTAGS.get(g_tag_id, str(g_tag_id))
                        gps_tags[g_name] = g_val

                    lat_raw = gps_tags.get("GPSLatitude")
                    lat_ref = gps_tags.get("GPSLatitudeRef", "N")
                    lon_raw = gps_tags.get("GPSLongitude")
                    lon_ref = gps_tags.get("GPSLongitudeRef", "E")
                    alt_raw = gps_tags.get("GPSAltitude")

                    if lat_raw and lon_raw:
                        lat = self._convert_to_degrees(lat_raw)
                        if str(lat_ref).upper() == "S":
                            lat = -lat

                        lon = self._convert_to_degrees(lon_raw)
                        if str(lon_ref).upper() == "W":
                            lon = -lon

                        altitude = float(alt_raw) if alt_raw else None

                        gmaps = f"https://www.google.com/maps?q={lat:.6f},{lon:.6f}"
                        osm = f"https://www.openstreetmap.org/?mlat={lat:.6f}&mlon={lon:.6f}#map=16/{lat:.6f}/{lon:.6f}"

                        gps_info = GPSInfo(
                            latitude=round(lat, 6),
                            longitude=round(lon, 6),
                            altitude=altitude,
                            google_maps_url=gmaps,
                            osm_url=osm
                        )
                        leak_warnings.append(f"Geotagging Leak: Embedded GPS Coordinates ({lat:.5f}, {lon:.5f}) identify exact physical location!")

            # Check software/camera leaks
            if "Make" in exif_data or "Model" in exif_data:
                leak_warnings.append(f"Hardware Fingerprint: Camera {exif_data.get('Make', '')} {exif_data.get('Model', '')} exposed.")
            if "Software" in exif_data:
                leak_warnings.append(f"Software Fingerprint: Processed using '{exif_data.get('Software')}'.")
            if "DateTimeOriginal" in exif_data:
                leak_warnings.append(f"Timestamp Leak: Original capture timestamp exposed ({exif_data.get('DateTimeOriginal')}).")

        except Exception as e:
            exif_data["error"] = f"Failed to parse image EXIF: {str(e)}"

        return exif_data, gps_info, leak_warnings

    def extract_pdf_metadata(self, file_bytes: bytes) -> Tuple[Dict[str, Any], List[str], List[str]]:
        props = {}
        urls = set()
        leak_warnings = []

        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            info = reader.metadata or {}

            for key, val in info.items():
                clean_key = str(key).lstrip("/").replace(":", "_")
                props[clean_key] = str(val)

            props["page_count"] = len(reader.pages)

            # Search for embedded URLs
            for page_idx, page in enumerate(reader.pages):
                # Search Annotations
                if "/Annots" in page:
                    annots = page["/Annots"]
                    if hasattr(annots, "get_object"):
                        annots = annots.get_object()
                    for a in annots:
                        obj = a.get_object()
                        if "/A" in obj and "/URI" in obj["/A"]:
                            uri = obj["/A"]["/URI"]
                            urls.add(str(uri))

                # Text regex for URLs
                try:
                    text = page.extract_text() or ""
                    found_urls = re.findall(r"https?://[^\s<>\"']+", text)
                    for u in found_urls[:10]:
                        urls.add(u)
                except Exception:
                    pass

            if "Author" in props:
                leak_warnings.append(f"Identity Leak: Document Author tag exposed ('{props['Author']}').")
            if "Creator" in props or "Producer" in props:
                leak_warnings.append(f"Software Leak: Created with '{props.get('Creator', '')}' / '{props.get('Producer', '')}'.")
            if "CreationDate" in props:
                leak_warnings.append(f"Timestamp Leak: Document CreationDate exposed ({props['CreationDate']}).")

        except Exception as e:
            props["error"] = f"Failed to parse PDF metadata: {str(e)}"

        return props, sorted(list(urls)), leak_warnings

    def extract_docx_metadata(self, file_bytes: bytes) -> Tuple[Dict[str, Any], List[str]]:
        props = {}
        leak_warnings = []

        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            cp = doc.core_properties
            props["author"] = cp.author or ""
            props["last_modified_by"] = cp.last_modified_by or ""
            props["created"] = str(cp.created) if cp.created else ""
            props["modified"] = str(cp.modified) if cp.modified else ""
            props["revision"] = str(cp.revision) if cp.revision else ""
            props["title"] = cp.title or ""
            props["subject"] = cp.subject or ""

            if props["author"]:
                leak_warnings.append(f"Identity Leak: Word Document Author exposed ('{props['author']}').")
            if props["last_modified_by"]:
                leak_warnings.append(f"Identity Leak: Last modified by '{props['last_modified_by']}'.")
            if props["created"] or props["modified"]:
                leak_warnings.append(f"Timestamp Leak: Document timestamps exposed ({props['created']}).")

        except Exception as e:
            props["error"] = f"Failed to parse DOCX: {str(e)}"

        return props, leak_warnings

    def analyze_file(self, filename: str, file_bytes: bytes, mime_type: str) -> FileMetadataResponse:
        file_size = len(file_bytes)
        ext = filename.split(".")[-1].lower() if "." in filename else ""

        exif_data = {}
        gps_info = None
        doc_props = {}
        embedded_urls = []
        leak_warnings = []

        if ext in ["jpg", "jpeg", "png", "webp", "tiff", "tif"]:
            file_type = "image"
            exif_data, gps_info, leak_warnings = self.extract_image_exif(file_bytes)
        elif ext == "pdf":
            file_type = "pdf"
            doc_props, embedded_urls, leak_warnings = self.extract_pdf_metadata(file_bytes)
        elif ext in ["docx", "doc"]:
            file_type = "document"
            doc_props, leak_warnings = self.extract_docx_metadata(file_bytes)
        else:
            file_type = "unknown"

        has_sensitive = len(leak_warnings) > 0 or gps_info is not None

        return FileMetadataResponse(
            filename=filename,
            file_type=file_type,
            file_size_bytes=file_size,
            mime_type=mime_type,
            exif_data=exif_data,
            gps_info=gps_info,
            document_properties=doc_props,
            embedded_urls=embedded_urls,
            has_sensitive_leaks=has_sensitive,
            leak_warnings=leak_warnings
        )

    def sanitize_file(self, filename: str, file_bytes: bytes) -> Tuple[bytes, str]:
        """Strip all metadata and return clean bytes and sanitized filename"""
        ext = filename.split(".")[-1].lower() if "." in filename else "bin"
        clean_name = f"sanitized_{filename}"

        if ext in ["jpg", "jpeg", "png", "webp", "tiff"]:
            try:
                img = Image.open(io.BytesIO(file_bytes))
                # Create clean image without exif
                clean_img = Image.new(img.mode, img.size)
                clean_img.putdata(list(img.getdata()))
                out_io = io.BytesIO()
                fmt = img.format or "JPEG"
                clean_img.save(out_io, format=fmt)
                return out_io.getvalue(), clean_name
            except Exception:
                return file_bytes, clean_name

        elif ext == "pdf":
            try:
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                writer = pypdf.PdfWriter()
                for page in reader.pages:
                    writer.add_page(page)
                # Clear all metadata
                writer.add_metadata({})
                out_io = io.BytesIO()
                writer.write(out_io)
                return out_io.getvalue(), clean_name
            except Exception:
                return file_bytes, clean_name

        return file_bytes, clean_name

