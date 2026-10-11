"""Read a photo or scan of printed staff notation into MusicXML."""

from __future__ import annotations

import logging
import threading
from argparse import Namespace
from pathlib import Path

from PIL import Image, ImageOps

from gakufu.errors import ScoreReadError

logger = logging.getLogger(__name__)

_LOCK = threading.Lock()
_MIN_MODEL_BYTES = 1_000_000


def prepare_image(source: Path, dest: Path) -> Path:
    try:
        with Image.open(source) as image:
            turned = ImageOps.exif_transpose(image)
            if turned is None:
                turned = image
            rgb = turned.convert("RGB")
            dest.parent.mkdir(parents=True, exist_ok=True)
            rgb.save(dest, "PNG")
    except Exception as exc:
        raise ScoreReadError(f"Could not open this image: {exc}") from exc
    return dest


def render_pdf(source: Path, work: Path) -> list[Path]:
    import fitz

    try:
        document = fitz.open(source)
    except Exception as exc:
        raise ScoreReadError(f"Could not open this PDF: {exc}") from exc
    try:
        if document.page_count == 0:
            raise ScoreReadError("This PDF has no pages.")
        if document.page_count > 6:
            raise ScoreReadError("PDFs are limited to 6 pages.")
        paths: list[Path] = []
        for index, page in enumerate(document, start=1):
            pixmap = page.get_pixmap(dpi=150, alpha=False)
            dest = work / f"page-{index}.png"
            pixmap.save(dest)
            paths.append(dest)
        return paths
    finally:
        document.close()


def recognize_image(image: Path, work: Path, *, deskew: bool) -> Path:
    """Run optical music recognition. One page can take a few minutes on CPU."""
    with _LOCK:
        _ensure_models()
        _force_cpu_runtime()
        try:
            from oemer.ete import clear_data, extract
        except ImportError as exc:
            raise ScoreReadError(
                "The sheet-music reader is not installed. "
                "Install requirements.txt, then replace onnxruntime-gpu with onnxruntime."
            ) from exc

        work.mkdir(parents=True, exist_ok=True)
        args = Namespace(
            img_path=str(image),
            output_path=str(work),
            use_tf=False,
            save_cache=False,
            without_deskew=not deskew,
        )
        clear_data()
        try:
            written = extract(args)
        except Exception as exc:
            logger.exception("Optical music recognition failed")
            raise ScoreReadError(
                "Could not read the notation on this page. Use a clear picture of printed "
                "five-line staff notation, or tick “Straighten a tilted photo” if the page is skewed. "
                f"Details: {exc}"
            ) from exc
        finally:
            clear_data()

    path = Path(str(written))
    if not path.is_file():
        raise ScoreReadError("The reader finished without writing a score.")
    return path


def _ensure_models() -> None:
    from oemer import MODULE_PATH
    from oemer.ete import CHECKPOINTS_URL, download_file

    base = Path(MODULE_PATH) / "checkpoints"
    needed = {
        "1st_model.onnx": base / "unet_big" / "model.onnx",
        "2nd_model.onnx": base / "seg_net" / "model.onnx",
    }
    for title, dest in needed.items():
        if dest.exists() and dest.stat().st_size > _MIN_MODEL_BYTES:
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        logger.info("Downloading recognition model %s", title)
        download_file(title, CHECKPOINTS_URL[title], str(dest))
        if not dest.exists() or dest.stat().st_size < _MIN_MODEL_BYTES:
            raise ScoreReadError(f"The recognition model {title} did not download completely.")


def _force_cpu_runtime() -> None:
    import onnxruntime as rt

    if getattr(rt, "_gakufu_cpu", False):
        return
    original = rt.InferenceSession

    def session(path, sess_options=None, providers=None, **kwargs):
        del providers, kwargs
        if sess_options is None:
            return original(path, providers=["CPUExecutionProvider"])
        return original(path, sess_options, providers=["CPUExecutionProvider"])

    rt.InferenceSession = session
    rt._gakufu_cpu = True
