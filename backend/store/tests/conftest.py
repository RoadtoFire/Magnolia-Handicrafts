import shutil
import tempfile

import pytest


@pytest.fixture(autouse=True)
def isolated_media_root(settings):
    """
    Point MEDIA_ROOT at a throwaway temp directory for every test so that
    ImageField uploads exercised in test_products.py never write into the
    real backend/media/ directory (which holds actual tracked product
    images).
    """
    tmp_dir = tempfile.mkdtemp(prefix='magnolia-test-media-')
    settings.MEDIA_ROOT = tmp_dir
    yield
    shutil.rmtree(tmp_dir, ignore_errors=True)
