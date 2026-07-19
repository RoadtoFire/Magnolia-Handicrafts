from .easypaisa import EasypaisaGateway
from .safepay import SafepayGateway

GATEWAYS = {
    'safepay': SafepayGateway(),
    'easypaisa': EasypaisaGateway(),
}


def get_gateway(name):
    try:
        return GATEWAYS[name]
    except KeyError:
        raise ValueError(f"Unknown payment gateway: {name!r}. Valid options: {list(GATEWAYS)}")
